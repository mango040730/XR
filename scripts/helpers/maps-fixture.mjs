// Test-only SDK response. Never imported by application code or shipped in dist.
// Device location still uses Chrome's real Geolocation API with CDP overrides.
export const mapsFixturePattern = {urlPattern:'https://maps.googleapis.com/maps/api/js*',requestStage:'Request'};
export const mapsFixtureSource = `(() => {
  const fixture=window.__mapsFixture={maps:[],requests:[],failGeocode:false};
  class TestMap {
    constructor(host,options) {
      this.host=host; this.options=options; this.center={...options.center}; this.events=new window.Map(); fixture.maps.push(this);
      host.tabIndex=0; host.style.background='repeating-linear-gradient(0deg,#ddd 0 48px,#f6f6f6 48px 54px)';
      const footer=document.createElement('div');footer.textContent='지도 SDK 테스트 대역 · 필수 표기 영역';
      footer.style='position:absolute;bottom:0;height:32px;left:0;right:0;background:#fff;color:#333;font:11px sans-serif';host.append(footer);
      let start=null;
      host.addEventListener('pointerdown',e=>{if(!this.options.draggable)return;start={x:e.clientX,y:e.clientY,center:{...this.center}};host.setPointerCapture(e.pointerId);});
      host.addEventListener('pointermove',e=>{if(!start)return;this.center={lat:start.center.lat+(e.clientY-start.y)*.00003,lng:start.center.lng-(e.clientX-start.x)*.00003};this.emit('center_changed');});
      host.addEventListener('pointerup',()=>{if(start){start=null;this.emit('idle');}});
      host.addEventListener('keydown',e=>{if(!this.options.keyboardShortcuts)return;const d={ArrowRight:[0,.0002],ArrowLeft:[0,-.0002],ArrowUp:[.0002,0],ArrowDown:[-.0002,0]}[e.key];if(d){e.preventDefault();this.setCenter({lat:this.center.lat+d[0],lng:this.center.lng+d[1]});}});
      setTimeout(()=>this.emit('idle'),0);
    }
    addListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn);return{remove:()=>this.events.get(type).delete(fn)};}
    emit(type){this.events.get(type)?.forEach(fn=>fn());}
    getCenter(){const c=this.center;return{lat:()=>c.lat,lng:()=>c.lng};}
    setCenter(c){this.center={...c};this.emit('center_changed');setTimeout(()=>this.emit('idle'),0);}
    setOptions(opts){Object.assign(this.options,opts);}
  }
  class Geocoder {
    async geocode(request){fixture.requests.push(request);await new Promise(r=>setTimeout(r,40));if(fixture.failGeocode)throw new Error('TEST_GEOCODING_FAILURE');
      const p=request.location??{lat:37.565,lng:126.975};
      return{results:[{formatted_address:'테스트 주소 '+p.lat.toFixed(5)+', '+p.lng.toFixed(5),place_id:'test-place',geometry:{location:{lat:()=>p.lat,lng:()=>p.lng}}}]};
    }
  }
  window.google={maps:{importLibrary:async name=>name==='maps'?{Map:TestMap,RenderingType:{RASTER:'RASTER'}}:{Geocoder}}};
  const cb=new URL(document.currentScript.src).searchParams.get('callback');setTimeout(()=>window[cb]?.(),0);
})();`;
