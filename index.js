import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show crashes as text on screen instead of letting the app close.
let errors = [];
const listeners = new Set();
function report(e, where) {
  const msg = (where ? '[' + where + '] ' : '') + String((e && e.message) || e) + '\n' + String((e && e.stack) || '').split('\n').slice(0, 8).join('\n');
  if (!errors.some((x) => x.slice(0, 120) === msg.slice(0, 120))) errors.push(msg);
  SplashScreen.hideAsync().catch(() => {});
  listeners.forEach((f) => f());
}
try {
  if (global.ErrorUtils) global.ErrorUtils.setGlobalHandler((e) => report(e, 'js'));
} catch (e) {}

let App = null;
try {
  App = require('./App').default;
} catch (e) {
  report(e, 'start');
}

class Boundary extends React.Component {
  componentDidCatch(error) { report(error, 'render'); }
  static getDerivedStateFromError() { return {}; }
  render() { return this.props.children; }
}

function Root() {
  const [key, setKey] = React.useState(0);
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { listeners.add(force); return () => listeners.delete(force); }, []);
  if (errors.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0f2e', paddingTop: 56, paddingHorizontal: 18, paddingBottom: 24 }}>
        <Text style={{ color: '#ff4d7e', fontSize: 20, fontWeight: '800' }}>Something went wrong</Text>
        <Text style={{ color: '#9aa5e6', marginVertical: 8 }}>Your progress is saved. Tap Restart to try again.</Text>
        <ScrollView style={{ flex: 1 }}>
          <Text selectable style={{ color: '#eaf2ff', fontSize: 11 }}>{errors.join('\n\n')}</Text>
        </ScrollView>
        <Pressable
          onPress={() => { errors = []; setKey((k) => k + 1); }}
          style={{ backgroundColor: '#ffb81f', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 }}
        >
          <Text style={{ color: '#1a1200', fontWeight: '800', fontSize: 15 }}>RESTART</Text>
        </Pressable>
      </View>
    );
  }
  return App ? <Boundary key={key}><App /></Boundary> : null;
}

if (Platform.OS === 'web') {
  // Web preview only: Skia needs its CanvasKit module loaded before the first frame.
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  LoadSkiaWeb({ locateFile: (f) => '/' + f }).then(() => registerRootComponent(Root)).catch(() => registerRootComponent(Root));
} else {
  registerRootComponent(Root);
}
