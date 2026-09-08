/* The first frame is HTML; download and compile 3D only after content has painted. */
(() => {
  const host=document.querySelector('.workbench');
  if(!host)return;
  const root=document.documentElement;
  const running=()=>root.dataset.motion==='running';
  const descriptions=['Veriyi hazırlamak ve anlamlandırmak.','Öğrenen modeller kurmak ve sınamak.','Sonuçları kullanılabilir bir arayüze taşımak.'];
  let started=false,visible=false,scene=null,selected=0;
  host.querySelectorAll('[data-workbench-stage]').forEach((button,index)=>button.addEventListener('click',()=>{
    selected=index;
    host.querySelectorAll('[data-workbench-stage]').forEach((item,i)=>item.setAttribute('aria-pressed',String(i===index)));
    host.querySelector('.workbench-description').textContent=descriptions[index];
    scene?.setStage(index);
  }));
  const enhance=async()=>{
    if(started||!visible||!running()||document.hidden)return;
    // Respect data saving as well as reduced motion; the same composition stays visible.
    if(navigator.connection?.saveData)return;
    started=true;
    try{
      const {createWorkbench}=await import('./assets/workbench.js?v=20260908-1');
      if(!running()||!visible||document.hidden){started=false;return;}
      scene=await createWorkbench(host,{isRunning:running});
      scene.setStage(selected);
    }catch{
      host.dataset.fallback='true';
    }
  };
  const schedule=()=>{
    if('requestIdleCallback' in window)requestIdleCallback(enhance,{timeout:2500});
    else setTimeout(enhance,300);
  };
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.6;if(visible&&document.readyState==='complete')schedule();},{threshold:[0,.6]});
  observer.observe(host);
  const afterPaint=()=>requestAnimationFrame(()=>requestAnimationFrame(schedule));
  if(document.readyState==='complete')afterPaint();else window.addEventListener('load',afterPaint,{once:true});
  document.addEventListener('portfolio:motion',()=>{if(document.readyState==='complete')schedule();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
})();
