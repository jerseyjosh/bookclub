import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { ClubProvider } from './lib/club.tsx'
import { BookPage } from './pages/BookPage.tsx'
import { Clubhouse } from './pages/Clubhouse.tsx'
import { MemberPage } from './pages/MemberPage.tsx'
import { Members } from './pages/Members.tsx'
import { Shelf } from './pages/Shelf.tsx'
import { Vote } from './pages/Vote.tsx'
import { EmptyState } from './components/ui.tsx'
import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <EmptyState title="Page not found">
      <Link to="/" className="link">
        Back to the overview
      </Link>
    </EmptyState>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ClubProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Clubhouse />} />
            <Route path="books" element={<Shelf />} />
            <Route path="books/:id" element={<BookPage />} />
            <Route path="members" element={<Members />} />
            <Route path="members/:id" element={<MemberPage />} />
            <Route path="vote" element={<Vote />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ClubProvider>
    </BrowserRouter>
  )
}
