import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5500,
    // host: true faz o Vite escutar em 0.0.0.0 (todas as interfaces de
    // rede), não só em localhost. Assim dá pra abrir o app no celular ou
    // tablet digitando o IP local do computador, ex: http://192.168.0.10:5500
    // (desde que o aparelho esteja na mesma rede Wi-Fi). Veja o README para
    // o passo a passo completo.
    host: true,
    // Abre o navegador sozinho ao rodar "npm run dev", já direto na tela
    // de login — não precisa digitar o endereço na mão.
    open: "/login",
  },
  preview: {
    port: 5500,
    host: true,
  },
});
