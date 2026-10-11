import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';

// Show crashes as text on screen instead of letting the app close.
const errors = [];
const listeners = new Set();
function report(e, where) {
  const msg = (where ? '[' + where + '] ' : '') + String((e && e.message) || e) + '\n' + String((e && e.stack) || '').split('\n').slice(0, 8).join('\n');
  if (!errors.some((x) => x.slice(0, 120) === msg.slice(0, 120))) errors.push(msg);
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
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { listeners.add(force); return () => listeners.delete(force); }, []);
  if (errors.length) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0b0f2e', paddingTop: 56, paddingHorizontal: 16 }}>
        <Text style={{ color: '#ff4d7e', fontSize: 18, fontWeight: '800' }}>Er ging iets mis</Text>
        <Text style={{ color: '#9aa5e6', marginVertical: 8 }}>Stuur een screenshot hiervan naar Claude.</Text>
        <ScrollView>
          <Text selectable style={{ color: '#eaf2ff', fontSize: 12 }}>{errors.join('\n\n')}</Text>
        </ScrollView>
      </View>
    );
  }
  return App ? <Boundary><App /></Boundary> : null;
}

registerRootComponent(Root);
