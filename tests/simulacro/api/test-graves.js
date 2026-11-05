const B='http://localhost:3999';
const j=async(m,u,b,t)=>{const r=await fetch(B+u,{method:m,headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined});let d;try{d=await r.json()}catch{d=null};return {s:r.status,d}};
const ok=(c,m)=>console.log((c?'OK  ':'FALLA ')+m);
(async()=>{
  const n=Date.now();
  const base={nombre:'T',apellido:'Test',email:`t${n}@x.com`,password:'Clave1234!',dniONumero:'123',matriculaNumero:'1',matriculaColegio:'C',matriculaVenceEl:'2030-01-01T00:00:00.000Z',seguroAseguradora:'S',seguroPoliza:'9',especiesAtiende:['perro','gato'],seguroVenceEl:'2030-01-01T00:00:00.000Z'};
  let r=await j('POST','/auth/veterinario/registrar',base); ok(r.s===400,'registro sin aceptar convenio: 400 -> '+r.s+' '+(r.d&&r.d.message));
  r=await j('POST','/auth/veterinario/registrar',{...base,aceptoConvenio:true}); ok(r.s<300,'registro con aceptación: '+r.s);
  const tk=r.d.accessToken;
  r=await j('GET','/veterinarios/convenio',null,tk); ok(r.d&&r.d.aceptado===true,'convenio aceptado registrado '+JSON.stringify(r.d));
  r=await j('GET','/veterinarios/mi-cobro',null,tk); ok(r.d&&r.d.puedeCobrar===false,'sin cobro: puedeCobrar=false');
  r=await j('PATCH','/veterinarios/paypal-email',{paypalEmail:'a@b.com'},tk); r=await j('GET','/veterinarios/mi-cobro',null,tk); ok(r.d.puedeCobrar===true,'con PayPal: puedeCobrar=true');
})();
