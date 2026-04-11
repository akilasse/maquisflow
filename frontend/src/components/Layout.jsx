import Navbar from './Navbar'

const Layout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <Navbar />
      <main style={{ marginLeft: '224px', padding: '16px' }}>
        {children}
      </main>
    </div>
  )
}

export default Layout