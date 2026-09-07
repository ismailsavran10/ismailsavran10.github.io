// A small, dependency-free WebGL sculpture. Geometry stays on the GPU.
export function createScene({canvas, isRunning, finePointer, reduceMotion, motionListeners}) {
  const options={alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true};
  const gl2=canvas.getContext('webgl2',options);
  const gl = gl2 || canvas.getContext('webgl',options);
  if (!gl) return;
  const surface = canvas.closest('.hero-visual');
  let lost = false, frame = 0, last = 0, elapsed = 0, visible = true;
  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  let width = 0, height = 0, ratio = 0;
  const vertex = `
    attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUv;
    uniform mat4 uModel; uniform float uAspect;
    varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv;
    void main(){
      vec4 p=uModel*vec4(aPosition,1.0);
      vPosition=p.xyz; vNormal=mat3(uModel)*aNormal; vUv=aUv;
      p.z-=7.5;
      gl_Position=vec4(2.42*p.x/uAspect,2.42*p.y,-1.004*p.z-.2004,-p.z);
    }`;
  const fragment = `
    precision mediump float;
    varying vec3 vNormal; varying vec3 vPosition; varying vec2 vUv;
    uniform vec3 uColor; uniform float uLogo; uniform sampler2D uTexture;
    void main(){
      if(uLogo>0.5){
        vec4 tex=texture2D(uTexture,vUv);
        if(tex.a<.025) discard;
        gl_FragColor=tex; return;
      }
      vec3 n=normalize(vNormal),v=normalize(vec3(0.,0.,7.5)-vPosition);
      vec3 l=normalize(vec3(-3.,5.,6.)),l2=normalize(vec3(4.,1.,2.));
      float diffuse=max(dot(n,l),0.);
      float spec=pow(max(dot(n,normalize(l+v)),0.),82.);
      float spec2=pow(max(dot(n,normalize(l2+v)),0.),36.);
      float rim=pow(1.-max(dot(n,v),0.),3.);
      vec3 reflection=reflect(-v,n);
      float softbox=smoothstep(.40,.58,reflection.y)*(1.-smoothstep(.70,.90,reflection.y));
      vec3 color=uColor*(.26+diffuse*.70)+vec3(.65,.91,1.)*rim*.40;
      color+=vec3(.85,.98,1.)*(spec*.95+spec2*.30+softbox*.46);
      gl_FragColor=vec4(pow(color,vec3(.80)),1.);
    }`;
  const compile = (type,source) => {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw new Error('3D shader unavailable');}
    return shader;
  };
  let program, vertexShader, fragmentShader;
  try {
    const vertexSource=gl2?'#version 300 es\n'+vertex.replaceAll('attribute ','in ').replaceAll('varying ','out '):vertex;
    const fragmentSource=gl2?'#version 300 es\nprecision mediump float;\nout vec4 outputColor;\n'+fragment.replaceAll('varying ','in ').replaceAll('texture2D(','texture(').replaceAll('gl_FragColor','outputColor'):fragment;
    vertexShader=compile(gl.VERTEX_SHADER,vertexSource); fragmentShader=compile(gl.FRAGMENT_SHADER,fragmentSource);
    program=gl.createProgram(); gl.attachShader(program,vertexShader);gl.attachShader(program,fragmentShader);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('3D program unavailable');
  } catch {return;}
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0,0,0,0);
  const attrs=['aPosition','aNormal','aUv'].map(name=>gl.getAttribLocation(program,name));
  const uniforms=Object.fromEntries(['uModel','uAspect','uColor','uLogo','uTexture'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const multiply=(a,b)=>{const m=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)m[c*4+r]+=a[k*4+r]*b[c*4+k];return m;};
  const transform=(x=0,y=0,z=0,rx=0,ry=0,rz=0,scale=1)=>{
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    const mx=new Float32Array([1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1]);
    const my=new Float32Array([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1]);
    const mz=new Float32Array([cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1]);
    const m=multiply(multiply(mx,my),mz);for(let i=0;i<12;i++)m[i]*=scale;m[12]=x;m[13]=y;m[14]=z;return m;
  };
  const meshes=[];
  const mesh=(points,indices)=>{
    const vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
    const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    const result={vertexBuffer,indexBuffer,count:indices.length};meshes.push(result);return result;
  };
  const parametric=(fn,uSteps,vSteps)=>{
    const points=[],indices=[];
    for(let u=0;u<=uSteps;u++)for(let v=0;v<=vSteps;v++)points.push(...fn(u/uSteps,v/vSteps));
    for(let u=0;u<uSteps;u++)for(let v=0;v<vSteps;v++){const a=u*(vSteps+1)+v,b=a+vSteps+1;indices.push(a,b,a+1,b,b+1,a+1);}
    return mesh(points,indices);
  };
  const torus=(radius,tube)=>parametric((u,v)=>{
    const a=u*Math.PI*2,b=v*Math.PI*2,c=Math.cos(a),s=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
    return [(radius+tube*cb)*c,(radius+tube*cb)*s,tube*sb,cb*c,cb*s,sb,u,v];
  },finePointer.matches?112:72,14);
  const orbit=torus(1.92,.105),fineOrbit=torus(2.20,.032),innerOrbit=torus(1.65,.047);
  const sphere=parametric((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI,x=Math.sin(b)*Math.cos(a),y=Math.cos(b),z=Math.sin(b)*Math.sin(a);return[x,y,z,x,y,z,u,v];},24,16);
  const logo=mesh([-1.37,-1.03,0,0,0,1,0,1,1.37,-1.03,0,0,0,1,1,1,1.37,1.03,0,0,0,1,1,0,-1.37,1.03,0,0,0,1,0,0],[0,1,2,0,2,3]);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const brand=surface.querySelector('.hero-brand img');
  let textureReady=false;
  const upload=()=>{
    if(lost || !brand?.naturalWidth)return;
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,brand);
    // Mipmaps preserve clean lettering when the original high-resolution logo shrinks.
    if(gl2){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}
    textureReady=true;draw();surface.dataset.scene='webgl';
  };
  const drawMesh=(geometry,model,color,logoMaterial=false)=>{
    gl.bindBuffer(gl.ARRAY_BUFFER,geometry.vertexBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,geometry.indexBuffer);
    attrs.forEach((attr,index)=>{gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,index===2?2:3,gl.FLOAT,false,32,index===0?0:index===1?12:24);});
    gl.uniformMatrix4fv(uniforms.uModel,false,model);gl.uniform3fv(uniforms.uColor,color);gl.uniform1f(uniforms.uLogo,logoMaterial?1:0);
    gl.drawElements(gl.TRIANGLES,geometry.count,gl.UNSIGNED_SHORT,0);
  };
  const draw=()=>{
    if(lost||!width||!height)return;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(uniforms.uAspect,width/height);
    const group=transform(0,.10+Math.sin(elapsed*.6)*.055,0,pointerY*.15,pointerX*.22,Math.sin(elapsed*.16)*.06);
    const primary=transform(0,0,-.10,.47+Math.sin(elapsed*.20)*.16,.35,-.42+elapsed*.025);
    const secondary=transform(0,0,-.15,1.02,-.34,.48-elapsed*.028);
    drawMesh(orbit,multiply(group,primary),[.025,.45,.56]);
    drawMesh(fineOrbit,multiply(group,secondary),[.43,.69,.76]);
    drawMesh(innerOrbit,multiply(group,transform(0,0,-.25,-.5,.48,-.65)),[.14,.49,.60]);
    const phase=elapsed*.22+.8;
    const orbitPoint=[Math.cos(phase)*1.92,Math.sin(phase)*1.92,0];
    const point=multiply(primary,transform(...orbitPoint,0,0,0,.19));
    drawMesh(sphere,multiply(group,point),[.01,.58,.67]);
    const phase2=-elapsed*.14+3.9;
    drawMesh(sphere,multiply(group,multiply(secondary,transform(Math.cos(phase2)*2.20,Math.sin(phase2)*2.20,0,0,0,0,.115))),[.46,.68,.83]);
    drawMesh(sphere,multiply(group,transform(-1.68,-1.24,.35,0,0,0,.08)),[.05,.42,.52]);
    // Keep the wordmark in front of the rings so every letter stays readable.
    if(textureReady)drawMesh(logo,multiply(group,transform(0,0,1.85,0,Math.sin(elapsed*.18)*.025,0,.79)),[1,1,1],true);
  };
  const canAnimate=()=>!lost&&visible&&!document.hidden&&isRunning()&&!reduceMotion.matches;
  const tick=time=>{
    frame=0;if(!canAnimate()){last=0;return;}
    const interactive=Math.abs(pointerX-targetX)+Math.abs(pointerY-targetY)>.015;
    if(last&&time-last<(interactive&&finePointer.matches?15:32)){frame=requestAnimationFrame(tick);return;}
    const delta=last?Math.min((time-last)/1000,.07):0;last=time;elapsed+=delta;
    const blend=1-Math.exp(-delta*5);pointerX+=(targetX-pointerX)*blend;pointerY+=(targetY-pointerY)*blend;
    draw();frame=requestAnimationFrame(tick);
  };
  const playback=()=>{
    if(canAnimate()){if(!frame)frame=requestAnimationFrame(tick);}
    else{cancelAnimationFrame(frame);frame=0;last=0;draw();}
  };
  const resize=()=>{
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
    if(bounds.width===width&&bounds.height===height&&ratio===dpr)return;
    width=bounds.width;height=bounds.height;ratio=dpr;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height);draw();playback();
  };
  const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;playback();});visibilityObserver.observe(canvas);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
  surface.addEventListener('pointermove',event=>{
    if(!finePointer.matches||!canAnimate())return;
    const r=surface.getBoundingClientRect();targetX=(event.clientX-r.left)/r.width*2-1;targetY=(event.clientY-r.top)/r.height*2-1;
  },{passive:true});
  surface.addEventListener('pointerleave',()=>{targetX=targetY=0;},{passive:true});
  document.addEventListener('visibilitychange',playback);motionListeners.add(playback);
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0;});
  window.addEventListener('pageshow',playback);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;delete surface.dataset.scene;});
  // Retain the original logo if a driver resets; reload can initialize a fresh context.
  canvas.addEventListener('webglcontextrestored',()=>{delete surface.dataset.scene;});
  resize();
  if(brand?.complete)upload();else brand?.addEventListener('load',upload,{once:true});
}
