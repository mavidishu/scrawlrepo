import { render, screen } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('should render headings correctly', () => {
    const markdown = `# H1 Heading
## H2 Heading
### H3 Heading`;

    render(<MarkdownRenderer content={markdown} />);
    
    expect(screen.getByText('H1 Heading')).toBeInTheDocument();
    expect(screen.getByText('H2 Heading')).toBeInTheDocument();
    expect(screen.getByText('H3 Heading')).toBeInTheDocument();
  });

  it('should render lists correctly', () => {
    const markdown = `- Item 1
- Item 2
- Item 3

1. First
2. Second
3. Third`;

    render(<MarkdownRenderer content={markdown} />);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('should render code blocks with syntax highlighting', () => {
    const markdown = '```typescript\nconst greeting = "Hello, World!";\nconsole.log(greeting);\n```';
    
    render(<MarkdownRenderer content={markdown} />);
    
    // The code content should be rendered
    expect(screen.getByText(/greeting/)).toBeInTheDocument();
  });

  it('should render inline code', () => {
    const markdown = 'The `const` keyword declares a variable.';
    
    render(<MarkdownRenderer content={markdown} />);
    
    expect(screen.getByText(/const/)).toBeInTheDocument();
  });

  it('should render blockquotes', () => {
    const markdown = '> This is a blockquote with important information.';
    
    render(<MarkdownRenderer content={markdown} />);
    
    expect(screen.getByText(/blockquote/i)).toBeInTheDocument();
  });

  it('should render links', () => {
    const markdown = '[GitHub](https://github.com)';
    
    render(<MarkdownRenderer content={markdown} />);
    
    const link = screen.getByText('GitHub');
    expect(link).toHaveAttribute('href', 'https://github.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should render bold and italic text', () => {
    const markdown = '**bold text** and *italic text*';
    
    render(<MarkdownRenderer content={markdown} />);
    
    expect(screen.getByText(/bold text/)).toBeInTheDocument();
    expect(screen.getByText(/italic text/)).toBeInTheDocument();
  });

  it('should render complex structured content', () => {
    const markdown = `
# Project Overview

This is a **full-stack** application built with modern technologies.

## Main Features

- Authentication with JWT
- Real-time data updates
- Advanced search capabilities
- User dashboard

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | NestJS |
| Database | PostgreSQL |

### Code Example

\`\`\`typescript
async function queryRepository(id: string, question: string) {
  const result = await aiService.query(id, question);
  return result;
}
\`\`\`

> Important: Always validate user input before processing.
`;

    render(<MarkdownRenderer content={markdown} />);
    
    // Verify key sections render
    expect(screen.getByText('Project Overview')).toBeInTheDocument();
    expect(screen.getByText(/full-stack/)).toBeInTheDocument();
    expect(screen.getByText('Main Features')).toBeInTheDocument();
    expect(screen.getByText('Tech Stack')).toBeInTheDocument();
    expect(screen.getByText(/Authentication with JWT/)).toBeInTheDocument();
  });
});
