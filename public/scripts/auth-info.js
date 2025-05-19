let usuario = null;

fetch("/auth/api/get-state", {
    method: 'GET',
    credentials: 'include'
}).then(async resposta => {
    const dado = await resposta.json();

    usuario = dado;
}).catch(e => {
    alert("Erro ao obter seus dados de login")
})
