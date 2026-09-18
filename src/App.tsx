/* Main App Component - Handles routing (using react-router-dom), query client and other providers - use this file to add all routes */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Pipeline from './pages/Pipeline'
import Metricas from './pages/Metricas'
import Mensagens from './pages/Mensagens'
import ProspeccaoParceiros from './pages/ProspeccaoParceiros'
import CadastroParceiros from './pages/CadastroParceiros'
import InscricaoParceiroPublica from './pages/InscricaoParceiroPublica'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
        </Route>

        {/* Formulário público: candidato não precisa de login */}
        <Route path="/parceiros/inscricao/:codigo" element={<InscricaoParceiroPublica />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/arenas" element={<Index />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/metricas" element={<Metricas />} />
            <Route path="/mensagens" element={<Mensagens />} />
            <Route path="/parceiros" element={<ProspeccaoParceiros />} />
            <Route path="/parceiros/cadastro" element={<CadastroParceiros />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
