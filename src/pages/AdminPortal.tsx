import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Loader2, Search, Download, Key } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AdminPortal = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'api-keys'>('sessions');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [generatingApiKey, setGeneratingApiKey] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        // In a real scenario, fetch from an admin-specific endpoint
        // For now, simulate fetching all envelopes
        const response = await fetch(`${API_URL}/api/admin/sessions`, {
          headers: {
            'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        const data = await response.json();
        setSessions(data.sessions || []);
        setFilteredSessions(data.sessions || []);
        /*
        // Mock data for sessions
        const mockSessions = [
          { id: 'ENV-001', recipient: { name: 'John Doe', email: 'john@example.com' }, status: 'pending', created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'ENV-002', recipient: { name: 'Jane Smith', email: 'jane@example.com' }, status: 'verified', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
          { id: 'ENV-003', recipient: { name: 'Bob Johnson', email: 'bob@example.com' }, status: 'completed', created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() },
        ];
        setSessions(mockSessions);
        setFilteredSessions(mockSessions);
        */
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching sessions');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  useEffect(() => {
    let filtered = sessions;
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        session.recipient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        session.recipient?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }
    setFilteredSessions(filtered);
  }, [searchTerm, statusFilter, sessions]);

  useEffect(() => {
    if (activeTab === 'api-keys') {
      fetchApiKeys();
    }
  }, [activeTab]);

  const fetchApiKeys = async () => {
    try {
      setIsLoadingApiKeys(true);
      const response = await fetch(`${API_URL}/api/admin/api-keys`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setApiKeys(data.apiKeys || []);
      setApiKeyError(null);
    } catch (err) {
      setApiKeyError(err instanceof Error ? err.message : 'Error fetching API keys');
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const handleDownloadDocument = async (sessionId) => {
    setDownloading(sessionId);
    try {
      const response = await fetch(`${API_URL}/api/signing-session/${sessionId}/document`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_document_${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download document');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAuditTrail = async (sessionId) => {
    setDownloading(sessionId);
    try {
      const response = await fetch(`${API_URL}/api/signing-session/${sessionId}/audit-trail`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download audit trail');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_trail_${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download audit trail');
    } finally {
      setDownloading(null);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }
    setGeneratingApiKey(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        },
        body: JSON.stringify({ name: newApiKeyName })
      });
      if (!response.ok) {
        throw new Error('Failed to generate API key');
      }
      const data = await response.json();
      alert(`API Key generated: ${data.apiKey}`);
      setNewApiKeyName('');
      fetchApiKeys(); // Refresh the list
    } catch (err) {
      alert('Failed to generate API key');
    } finally {
      setGeneratingApiKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }
      fetchApiKeys(); // Refresh the list
    } catch (err) {
      alert('Failed to revoke API key');
    }
  };

  if (isLoading && activeTab === 'sessions') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
        <p className="text-gray-600">Loading sessions...</p>
      </div>
    );
  }

  if (error && activeTab === 'sessions') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (isLoadingApiKeys && activeTab === 'api-keys') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-2" />
        <p className="text-gray-600">Loading API keys...</p>
      </div>
    );
  }

  if (apiKeyError && activeTab === 'api-keys') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-500 mb-4">{apiKeyError}</p>
        <Button onClick={() => fetchApiKeys()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Portal</h1>
        <div className="flex gap-4 mb-6">
          <Button 
            variant={activeTab === 'sessions' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('sessions')}
          >
            Signing Sessions
          </Button>
          <Button 
            variant={activeTab === 'api-keys' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('api-keys')}
          >
            API Keys
          </Button>
        </div>
        {activeTab === 'sessions' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="Search by ID, name, or email..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="verification_failed">Verification Failed</SelectItem>
                  <SelectItem value="prepared">Prepared</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">No sessions found</TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.id}</TableCell>
                        <TableCell>{session.recipient?.name || 'N/A'}</TableCell>
                        <TableCell>{session.recipient?.email || 'N/A'}</TableCell>
                        <TableCell>{session.status}</TableCell>
                        <TableCell>{new Date(session.created_at).toLocaleString()}</TableCell>
                        <TableCell>{session.expires_at ? new Date(session.expires_at).toLocaleString() : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => alert(`View details for session ${session.id}`)}>View</Button>
                            {session.status === 'completed' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownloadDocument(session.id)} 
                                  disabled={downloading === session.id}
                                >
                                  {downloading === session.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                                  Doc
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDownloadAuditTrail(session.id)} 
                                  disabled={downloading === session.id}
                                >
                                  {downloading === session.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                                  Audit
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {activeTab === 'api-keys' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Input 
                placeholder="New API Key Name" 
                value={newApiKeyName} 
                onChange={(e) => setNewApiKeyName(e.target.value)} 
                className="flex-1"
              />
              <Button 
                onClick={handleGenerateApiKey} 
                disabled={generatingApiKey || !newApiKeyName.trim()}
              >
                {generatingApiKey ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Key className="w-4 h-4 mr-1" />}
                Generate API Key
              </Button>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Key (Partial)</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">No API keys found</TableCell>
                    </TableRow>
                  ) : (
                    apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.id}</TableCell>
                        <TableCell>{key.name}</TableCell>
                        <TableCell>{key.partial_key || '****-****-****-****'}</TableCell>
                        <TableCell>{new Date(key.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleRevokeApiKey(key.id)}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;