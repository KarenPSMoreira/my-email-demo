const token = sessionStorage.getItem("myEmailToken");
if (!token) window.location.replace("login.html");

const form = document.querySelector("#email-form");
const message = document.querySelector("#message");

document.querySelector("#logout").addEventListener("click", () => {
  sessionStorage.removeItem("myEmailToken");
  window.location.replace("login.html");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Processando simulação...";
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        to: document.querySelector("#to").value,
        subject: document.querySelector("#subject").value,
        body: document.querySelector("#body").value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível processar.");
    message.textContent = data.message;
    form.reset();
  } catch (error) {
    message.textContent = error.message || "Falha ao conectar ao servidor.";
  }
});
