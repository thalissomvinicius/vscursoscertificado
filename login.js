"use strict";

let needsSetup = false;
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const submit = document.getElementById("loginSubmit");
VS.icons();
submit.disabled=true;
VS.api("/api/auth/status").then(status=>{
  if(status.user) { location.replace("dashboard.html");return; }
  needsSetup=status.needsSetup;
  if(needsSetup) {
    document.getElementById("loginTitle").textContent="Crie o administrador";
    document.getElementById("loginKicker").textContent="PRIMEIRO ACESSO";
    document.getElementById("loginDetail").textContent="Defina seu usuário e uma senha de pelo menos 12 caracteres.";
    document.getElementById("nameWrap").classList.remove("hidden"); document.getElementById("confirmationWrap").classList.remove("hidden");
    document.getElementById("loginName").required=true;document.getElementById("loginConfirmation").required=true;
    document.getElementById("loginPassword").minLength=12; document.getElementById("loginPassword").autocomplete="new-password";
    submit.innerHTML='Criar conta <i data-lucide="arrow-right"></i>';VS.icons();
  }
  submit.disabled=false;
}).catch(()=>{loginError.textContent="Servidor indisponível. Inicie o sistema com npm start e abra o endereço exibido.";});
document.getElementById("showPassword").onclick=()=>{
  const field=document.getElementById("loginPassword");field.type=field.type==="password"?"text":"password";
  const button=document.getElementById("showPassword");button.title=field.type==="password"?"Mostrar senha":"Ocultar senha";button.setAttribute("aria-label",button.title);
};
loginForm.onsubmit=async event=>{
  event.preventDefault();loginError.textContent="";
  const password=document.getElementById("loginPassword").value;
  if(needsSetup && password!==document.getElementById("loginConfirmation").value) {loginError.textContent="As senhas não conferem.";return;}
  submit.disabled=true;
  try {
    await VS.api(`/api/auth/${needsSetup?"setup":"login"}`,{method:"POST",body:{username:document.getElementById("loginUser").value,name:document.getElementById("loginName").value,password}});
    location.replace("dashboard.html");
  } catch(error) {loginError.textContent=error.message;submit.disabled=false;}
};
