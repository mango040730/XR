import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchClayProps} from './clay-gatherings.js';

const LABELS={knitting:'뜨개질',blocks:'블록쌓기',beads:'비즈공예품'};
export function createTerraceCrafts(){
  const root=new THREE.Group();root.name='Terrace_tabletop_crafts';
  const finishes={};
  for(const [id,color] of Object.entries({ivory:'#FDE8DC',coral:'#D94224',blue:'#A5BCD5',gold:'#E9B745',sage:'#91A17B',yarn:'#DA9C87'})){
    finishes[id]=new THREE.MeshPhysicalMaterial({name:`Clay craft ${id}`,color,roughness:.72,metalness:0,clearcoat:.07,clearcoatRoughness:.65,specularIntensity:.35});
  }
  const add=(group,geometry,finish,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,finishes[finish]);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;
  };
  const box=(g,w,h,d,x,y,z,c,r=.008)=>add(g,new RoundedBoxGeometry(w,h,d,8,Math.min(r,h*.45)),c,x,y,z);
  const sphere=(g,r,x,y,z,c)=>add(g,new THREE.SphereGeometry(r,40,28),c,x,y,z);
  const tube=(g,points,r,c,closed=false)=>add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),64,r,12,closed),c);
  const groups=Object.keys(LABELS).map((id,index)=>{
    const g=new THREE.Group();g.name=`Craft_${id}`;g.userData.craftId=id;g.userData.label=LABELS[id];g.position.x=(index-1)*.23;root.add(g);
    g.userData.pickPoint={knitting:[-.024,.069,-.018],blocks:[.033,.104,.029],beads:[0,.029,.057]}[id];
    box(g,.20,.014,.19,0,.007,0,'ivory');
    if(id==='knitting'){
      sphere(g,.055,-.024,.069,-.018,'yarn');
      for(let ring=0;ring<8;ring++){
        const tilt=ring*.37,points=[];
        for(let i=0;i<=64;i++){
          const t=i*Math.PI/32,point=new THREE.Vector3(Math.cos(t)*.0557,Math.sin(t)*.0557,0);
          point.applyAxisAngle(new THREE.Vector3(0,1,0),tilt).applyAxisAngle(new THREE.Vector3(0,0,1),.33).add(new THREE.Vector3(-.024,.069,-.018));points.push(point);
        }
        tube(g,points,.0014,'coral');
      }
      box(g,.074,.016,.067,.042,.022,.045,'blue',.006);
      for(let row=0;row<4;row++)for(let col=0;col<5;col++){
        const loop=add(g,new THREE.TorusGeometry(.005,.0019,10,20),'blue',.015+col*.0135,.032,.022+row*.014);
        loop.rotation.x=-Math.PI/2;
      }
      for(const [a,b] of [[[-.07,.025,.07],[.07,.15,-.04]],[[-.045,.025,.075],[.075,.145,-.03]]]){
        const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
        const needle=add(g,new THREE.CapsuleGeometry(.0035,direction.length()-.007,6,16),'gold');needle.position.copy(start).lerp(end,.5);
        needle.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());sphere(g,.006,...end.toArray(),'gold');
      }
      tube(g,[new THREE.Vector3(-.02,.014,.035),new THREE.Vector3(-.06,.016,.065),new THREE.Vector3(-.075,.015,.02)],.002,'yarn');
    }else if(id==='blocks'){
      for(const [x,y,z,c] of [[-.034,.044,-.029,'blue'],[.033,.044,.029,'sage'],[-.034,.104,-.029,'coral'],[.033,.104,.029,'gold'],[-.034,.164,-.029,'blue']]){
        box(g,.058,.06,.058,x,y,z,c,.009);
      }
    }else{
      const points=[];
      for(let i=0;i<=64;i++){const a=i*Math.PI/32;points.push(new THREE.Vector3(Math.cos(a)*.057,.029,Math.sin(a)*.057));}
      tube(g,points,.002,'gold');
      for(let i=0;i<14;i++){
        const a=i*Math.PI/7,bead=add(g,new THREE.TorusGeometry(.008,.006,16,28),['coral','blue','gold','sage'][i%4],Math.cos(a)*.057,.029,Math.sin(a)*.057);
        bead.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(-Math.sin(a),0,Math.cos(a)));
      }
      sphere(g,.011,.074,.025,.066,'coral');sphere(g,.010,.046,.024,.075,'blue');
    }
    batchClayProps(g);g.visible=false;return g;
  });
  root.visible=false;
  return {
    root,groups,
    place(seat){root.matrixAutoUpdate=false;root.matrix.copy(seat.workMatrix);root.updateMatrixWorld(true);},
    show(choice=null){root.visible=true;groups.forEach(g=>g.visible=!choice||g.userData.craftId===choice);},
    hide(){root.visible=false;},
    dispose(){root.removeFromParent();root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});Object.values(finishes).forEach(m=>m.dispose());},
  };
}
