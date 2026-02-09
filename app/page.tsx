import { Button, Card, Row, Col, Tag } from "antd";

async function checkDatabase() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`, {
      cache: 'no-store'
    });
    return await response.json();
  } catch (error) {
    return { status: 'error', error: 'Failed to connect to API' };
  }
}

export default async function Home() {
  const dbStatus = await checkDatabase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <main className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Maju App</h1>
          <p className="text-muted-foreground">
            Next.js + TypeScript + MySQL + Ant Design Boilerplate
          </p>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Database Status" extra={<Tag color={dbStatus.status === 'ok' ? 'success' : 'error'}>
              {dbStatus.status === 'ok' ? 'Connected' : 'Disconnected'}
            </Tag>}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database:</span>
                  <span className="text-sm font-medium">{dbStatus.database || 'N/A'}</span>
                </div>
                {dbStatus.timestamp && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Check:</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(dbStatus.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Tech Stack">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Framework:</span>
                  <span className="text-sm font-medium">Next.js 16</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Language:</span>
                  <span className="text-sm font-medium">TypeScript</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database:</span>
                  <span className="text-sm font-medium">MySQL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">UI Library:</span>
                  <span className="text-sm font-medium">Ant Design</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="Quick Start">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Configure your database connection in <code className="px-1 py-0.5 bg-muted rounded">.env.local</code>
              </p>
              <p className="text-sm text-muted-foreground">
                2. Create your database: <code className="px-1 py-0.5 bg-muted rounded">CREATE DATABASE maju_app;</code>
              </p>
              <p className="text-sm text-muted-foreground">
                3. Start the development server: <code className="px-1 py-0.5 bg-muted rounded">npm run dev</code>
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="primary">Get Started</Button>
              <Button>View Docs</Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
