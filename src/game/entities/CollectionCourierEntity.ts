import Phaser from "phaser";
import { palette } from "../art/palette";
import type { ResourceAmounts } from "../config/resourceDefinitions";

export class CollectionCourierEntity {
  private readonly cart:Phaser.GameObjects.Container;
  private readonly load:Phaser.GameObjects.Graphics;
  constructor(scene:Phaser.Scene,x:number,y:number){
    const body=scene.add.graphics().fillStyle(palette.outline).fillCircle(0,-18,13).fillStyle(palette.teal).fillRect(-13,-8,26,34).fillStyle(palette.cream).fillTriangle(-18,-27,18,-27,0,-42);
    const wagon=scene.add.graphics().lineStyle(5,palette.outline).fillStyle(palette.soil).fillRoundedRect(-55,20,75,42,7).strokeRoundedRect(-55,20,75,42,7).fillStyle(palette.outline).fillCircle(-40,65,11).fillCircle(5,65,11);
    this.load=scene.add.graphics();this.cart=scene.add.container(x,y,[wagon,this.load,body]).setDepth(1900).setVisible(false);
  }
  setVisible(value:boolean):void{this.cart.setVisible(value);}
  setPosition(x:number,y:number):void{this.cart.setPosition(x,y).setDepth(y+600);}
  get position():{x:number;y:number}{return{x:this.cart.x,y:this.cart.y};}
  setLoad(amounts:ResourceAmounts,capacity:number):void{const total=Object.values(amounts).reduce((n,v)=>n+v,0),ratio=capacity?total/capacity:0;this.load.clear().fillStyle(amounts.egg?palette.cream:amounts.corn?0xf2c84b:palette.wheat).fillRoundedRect(-50,48-Math.round(25*ratio),65,Math.max(3,Math.round(25*ratio)),3);}
  destroy():void{this.cart.destroy(true);}
}
