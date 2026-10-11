export const T = {
  ink: '#0b0f2e', ink2: '#131a47', ink3: '#1c2566', line: '#2e3a8c',
  ice: '#eaf2ff', muted: '#9aa5e6', dim: '#6c78c8',
  amber: '#ffb81f', amberDeep: '#a8730a', rose: '#ff4d7e', mint: '#58f2c9', cyan: '#6fd8ff',
};

// Font names match the loaded expo-font families. If a font fails to load the system font is used.
export const F = {
  display: 'Unbounded_800ExtraBold',
  displayM: 'Unbounded_600SemiBold',
  mono: 'DMMono_400Regular',
  monoM: 'DMMono_500Medium',
};

export const fmt = (n) => Math.round(n).toLocaleString('en-US');
