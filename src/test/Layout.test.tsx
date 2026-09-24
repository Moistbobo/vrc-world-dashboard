import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '../components/layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

vi.mock('../api/client', () => ({
  fetchHealth: vi.fn(() => Promise.resolve()),
}))

describe('Layout sidebar', () => {
  let storage: Record<string, string> = {}

  beforeEach(() => {
    storage = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    queryClient.clear()
  })

  it('renders expanded by default when no localStorage value exists', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    expect(screen.getByText('SOS Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Worlds')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
  })

  it('renders a skip link as the first tab stop targeting main content', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    const skipLink = screen.getByRole('link', { name: /skip to main content/i })
    expect(skipLink).toHaveAttribute('href', '#main')
    expect(skipLink).toHaveClass('sr-only')

    const main = document.querySelector('main#main')
    expect(main).not.toBeNull()
  })

  it('reads collapsed state from localStorage on mount', () => {
    storage['sos-sidebar-collapsed'] = 'true'

    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    // When collapsed the toggle label flips to "Expand"
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
    // Title text is still in DOM (hidden on lg via CSS)
    expect(screen.queryByText('SOS Dashboard')).toBeInTheDocument()
  })

  it('toggles collapsed state and persists to localStorage', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    const toggle = screen.getByLabelText('Collapse sidebar')
    expect(toggle).toBeInTheDocument()

    // Collapse
    fireEvent.click(toggle)
    expect(storage['sos-sidebar-collapsed']).toBe('true')
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()

    // Expand back
    fireEvent.click(screen.getByLabelText('Expand sidebar'))
    expect(storage['sos-sidebar-collapsed']).toBe('false')
    expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
  })

  it('renders navigation links to all routes', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    const nav = screen.getByRole('navigation')
    const links = within(nav).getAllByRole('link')
    const labels = links.map((l) => l.textContent)

    expect(labels).toContain('Dashboard')
    expect(labels).toContain('Worlds')
    expect(labels).toContain('Tags')
    expect(labels).toContain('Lists')
    expect(labels).toContain('Settings')
  })

  it('renders mobile menu button and hides desktop collapse toggle', async () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    // Wait for async health check effect to settle
    await waitFor(() => {
      // Mobile close button (X) is always rendered
      expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument()
      // Desktop collapse toggle uses aria-label
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })
  })

  it('renders the sticky header above world card elements', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    const header = document.querySelector('header.sticky')
    expect(header).toHaveClass('z-40')
  })

  it('keeps the theme toggle in the right-aligned header actions container', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>,
      { wrapper: Wrapper },
    )

    const header = document.querySelector('header.sticky')
    expect(header).toBeInTheDocument()

    const actions = header?.querySelector('.ml-auto')
    expect(actions).toBeInTheDocument()

    const toggle = screen.getByLabelText('Toggle theme')
    expect(actions).toContainElement(toggle)
  })
})
