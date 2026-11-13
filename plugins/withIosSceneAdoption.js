const fs = require('fs');
const path = require('path');
const { withAppDelegate, withInfoPlist, withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');

const SCENE_DELEGATE_H = `#import <UIKit/UIKit.h>

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>

@property (strong, nonatomic) UIWindow *window;

@end
`;

const SCENE_DELEGATE_MM = `#import "SceneDelegate.h"
#import "AppDelegate.h"

// El propio AppDelegate (singleton) guarda rootViewFactory/moduleName/initialProps,
// ya configurados en \`application:didFinishLaunchingWithOptions:\`. UIKit crea una
// instancia NUEVA de esta clase para la escena, así que debemos pedirle esos datos
// al AppDelegate real en vez de asumir que son los nuestros.
@implementation SceneDelegate

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  UIWindowScene *windowScene = (UIWindowScene *)scene;
  AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;

  UIView *rootView = [appDelegate.rootViewFactory viewWithModuleName:appDelegate.moduleName
                                                    initialProperties:appDelegate.initialProps
                                                        launchOptions:nil];

  self.window = [[UIWindow alloc] initWithWindowScene:windowScene];
  UIViewController *rootViewController = [appDelegate createRootViewController];
  [appDelegate setRootView:rootView toRootViewController:rootViewController];
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
}

@end
`;

/**
 * iOS 27+ crashea la app al abrirla sin el depurador de Xcode conectado si no
 * adopta el ciclo de vida de UIScene. RCTAppDelegate (React Native 0.76) no trae
 * soporte real de Scenes.
 *
 * Nota importante: UIKit instancia un objeto NUEVO de la clase delegada de escena
 * (no reutiliza el AppDelegate singleton), por eso la ventana no puede crearse
 * dentro del propio AppDelegate — necesita una clase SceneDelegate separada que
 * consulte al AppDelegate real vía [UIApplication sharedApplication].delegate.
 */
function withIosSceneAdoption(config) {
  // 1. Escribe SceneDelegate.h/.mm junto a AppDelegate.mm.
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const sourceRoot = IOSConfig.Paths.getSourceRoot(config.modRequest.projectRoot);
      fs.writeFileSync(path.join(sourceRoot, 'SceneDelegate.h'), SCENE_DELEGATE_H);
      fs.writeFileSync(path.join(sourceRoot, 'SceneDelegate.mm'), SCENE_DELEGATE_MM);
      return config;
    },
  ]);

  // 2. Registra los archivos nuevos en el proyecto Xcode (Sources build phase).
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const groupName = path.basename(config.modRequest.projectName ?? 'Bita');
    const target = project.getFirstTarget().uuid;

    const mmPath = `${groupName}/SceneDelegate.mm`;
    const hPath = `${groupName}/SceneDelegate.h`;

    if (!project.hasFile(mmPath)) {
      project.addSourceFile(mmPath, { target }, project.findPBXGroupKey({ name: groupName }));
    }
    if (!project.hasFile(hPath)) {
      project.addHeaderFile(hPath, {}, project.findPBXGroupKey({ name: groupName }));
    }

    return config;
  });

  // 3. AppDelegate: declara la clase de escena como SceneDelegate (ya existe de verdad).
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    if (!contents.includes('#import "SceneDelegate.h"')) {
      config.modResults.contents = config.modResults.contents.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import "SceneDelegate.h"'
      );
    }

    if (!config.modResults.contents.includes('automaticallyLoadReactNativeWindow = NO')) {
      config.modResults.contents = config.modResults.contents.replace(
        'self.initialProps = @{};\n',
        'self.initialProps = @{};\n\n'
          + '  // La ventana la crea SceneDelegate, anclada a la UIWindowScene real\n'
          + '  // (si no, RCTAppDelegate crea una segunda ventana sin escena y duplica el bridge).\n'
          + '  self.automaticallyLoadReactNativeWindow = NO;\n'
      );
    }

    if (!config.modResults.contents.includes('configurationForConnectingSceneSession')) {
      const marker = '// Linking API';
      const sceneMethod = `// Adopción del ciclo de vida de Scenes (requerido por iOS 27+; sin esto la app
// crashea al abrirla sin el depurador de Xcode conectado).
- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options
{
  UISceneConfiguration *configuration = [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
  configuration.delegateClass = [SceneDelegate class];
  return configuration;
}

${marker}`;

      config.modResults.contents = config.modResults.contents.includes(marker)
        ? config.modResults.contents.replace(marker, sceneMethod)
        : config.modResults.contents.replace(
            '@implementation AppDelegate',
            `@implementation AppDelegate\n\n${sceneMethod.replace(`\n\n${marker}`, '')}`
          );
    }

    return config;
  });

  // 4. Info.plist: UISceneDelegateClassName = SceneDelegate (la clase real, no AppDelegate).
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  return config;
}

module.exports = withIosSceneAdoption;
