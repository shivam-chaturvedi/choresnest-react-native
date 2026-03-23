module.exports = {
    dependencies: {
        'react-native-vector-icons': {
            platforms: {
                ios: null, // disable auto-linking for iOS — fonts are declared manually in Info.plist
            },
        },
    },
    assets: ['./assets/fonts'],
};
