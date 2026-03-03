import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import GroupsPage from "./pages/GroupsPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const [auth, setAuth] = useState(false);

  if (!auth) {
    return <LoginPage onLogin={() => setAuth(true)} />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <div className="container">
          <Routes>
            <Route path="/" element={<GroupsPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
