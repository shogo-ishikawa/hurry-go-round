import Phaser from 'phaser';
import { PrototypeScene } from './game/scenes/PrototypeScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#17263c',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  render: { antialias: true },
  scene: PrototypeScene,
});
