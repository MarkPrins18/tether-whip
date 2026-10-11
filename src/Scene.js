// Skia canvas. Loaded lazily (first Play) so a Skia problem cannot stop the app from opening.
import React, { forwardRef, memo, useImperativeHandle, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { drawScene } from './render';

const Scene = forwardRef(function Scene(_, ref) {
  const [pic, setPic] = useState(null);
  useImperativeHandle(ref, () => ({
    draw: (g, w, h) => {
      setPic(createPicture((c) => drawScene(c, g, w, h, false), Skia.XYWHRect(0, 0, w, h)));
    },
  }), []);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {pic ? <Picture picture={pic} /> : null}
    </Canvas>
  );
});

export default memo(Scene);
