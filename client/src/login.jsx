import React, { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function entrar(e) {
  e.preventDefault();
  setErro("");
  try {
    const res = await signInWithEmailAndPassword(auth, email, senha);
    onLogin(res.user);
  } catch (err) {
    console.error(err);
    // Handle common auth issues with clearer messages
    if (err.code === "auth/invalid-api-key" || (err.message && err.message.toLowerCase().includes('api-key'))) {
      setErro("Erro de configuração do Firebase: apiKey inválida. Verifique 'client/src/firebase.js' e as credenciais do seu projeto.");
    } else {
      setErro("Erro ao entrar: " + (err.code || err.message || err));
    }
  }
}



  async function registrar(e) {
  e.preventDefault();
  setErro("");
  try {
    const res = await createUserWithEmailAndPassword(auth, email, senha);
    onLogin(res.user);
  } catch (err) {
    console.error(err);
    if (err.code === "auth/email-already-in-use") {
      setErro("Este e-mail já está em uso. Use o botão Entrar.");
    } else if (err.code === "auth/weak-password") {
      setErro("Senha muito fraca. Use pelo menos 6 caracteres.");
    } else if (err.code === "auth/invalid-email") {
      setErro("E-mail inválido.");
    } else if (err.code === "auth/invalid-api-key" || (err.message && err.message.toLowerCase().includes('api-key'))) {
      setErro("Configuração do Firebase inválida (apiKey). Verifique as credenciais em 'client/src/firebase.js' e as restrições da API key.");
    } else {
      setErro("Erro ao criar conta: " + (err.code || err.message || err));
    }
  }
}


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0b1220",
        color: "#fff",
      }}
    >
      <h2>Login — Mytragor Simulador</h2>
      <input
        type="email"
        placeholder="Seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ margin: "8px", padding: "8px", width: "250px" }}
      />
      <input
        type="password"
        placeholder="Sua senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        style={{ margin: "8px", padding: "8px", width: "250px" }}
      />
      {erro && <p style={{ color: "red" }}>{erro}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={entrar} style={{ padding: "8px 16px", marginTop: "8px" }}>
          Entrar
        </button>
        <button onClick={registrar} style={{ padding: "8px 16px", marginTop: "8px" }}>
          Criar Conta
        </button>
      </div>
    </div>
  );
}
