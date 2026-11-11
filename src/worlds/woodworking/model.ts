import { BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Texture } from 'three';

/** Port of the attached AtelierModel: clone first, preserve PBR/UV/maps and restore export flags. */
export function cloneAtelierModel(scene: Group): Group {
  const clone=scene.clone(true),materials=new Map<Material,Material>(),geometries=new Map<BufferGeometry,BufferGeometry>(),textures=new Map<Texture,Texture>();
  const texture=(source:Texture)=>{let copy=textures.get(source);if(!copy){copy=source.clone();copy.anisotropy=4;copy.needsUpdate=true;textures.set(source,copy);}return copy;};
  clone.traverse(node=>{
    if(!(node instanceof Mesh))return;
    const flags=node.userData.atelierShadow as {cast:boolean;receive:boolean}|undefined;
    node.castShadow=flags?.cast??true;node.receiveShadow=flags?.receive??true;
    const sourceGeometry:BufferGeometry=node.geometry;let geometry=geometries.get(sourceGeometry);
    if(!geometry){geometry=sourceGeometry.clone();geometries.set(sourceGeometry,geometry);}node.geometry=geometry;
    const prepare=(source:Material):Material=>{
      const existing=materials.get(source);if(existing)return existing;
      const material=source.clone();
      for(const [key,value] of Object.entries(source))if(value instanceof Texture)Reflect.set(material,key,texture(value));
      const settings=source.userData.atelierRender as {depthWrite:boolean;flatShading:boolean;normalScale?:number[]}|undefined;
      if(settings){material.depthWrite=settings.depthWrite;if(material instanceof MeshStandardMaterial){material.flatShading=settings.flatShading;if(material.normalMap&&settings.normalScale)material.normalScale.fromArray(settings.normalScale);}}
      material.needsUpdate=true;materials.set(source,material);return material;
    };
    node.material=Array.isArray(node.material)?node.material.map(prepare):prepare(node.material);
  });
  return clone;
}
