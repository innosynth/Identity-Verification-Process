import { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Loader2, Search, Download, Key, Trash2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

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
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Move fetchSessions out of useEffect so it can be called elsewhere
  const fetchSessions = async () => {
    try {
      setIsLoading(true);
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching sessions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let filtered = sessions;
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        session.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        session.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleDownloadDocument = async (sessionId, docId = null) => {
    try {
      setDownloading(sessionId);
      // Find the document by docId
      const doc = documents.find(d => d.id === docId);
      if (!doc) {
        throw new Error('Document not found');
      }
      // Call backend endpoint to get decrypted PDF
      const url = `${API_URL}/api/document/${doc.id}/download`;
      const response = await fetch(url, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      window.open(downloadUrl, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
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

  const handleViewSession = async (session) => {
    setSelectedSession(session);
    setSelectedStatus(session.status);
    setIsViewModalOpen(true);
    fetchDocuments(session.id);
  };

  const fetchDocuments = async (sessionId) => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`${API_URL}/api/signing-session/${sessionId}`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }
      const data = await response.json();
      setDocuments(data.session.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const generateSharableLink = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/envelope/${sessionId}/signing-link`, {
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        // Show backend error message
        alert(data.error || 'Failed to fetch sharable link. Envelope must be verified or prepared.');
        return;
      }
      const link = data.signingLink;
      navigator.clipboard.writeText(link);
      alert(`Sharable link copied to clipboard: ${link}`);
    } catch (err) {
      console.error('Error fetching sharable link:', err);
      alert('Failed to fetch sharable link');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedSession || !selectedStatus) return;
    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`${API_URL}/api/envelope/${selectedSession.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        },
        body: JSON.stringify({ status: selectedStatus })
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      setSessions(sessions.map(s => s.id === selectedSession.id ? { ...s, status: selectedStatus } : s));
      setSelectedSession({ ...selectedSession, status: selectedStatus });
      alert('Status updated successfully');
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePrepareEnvelope = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/envelope/${sessionId}/prepare`, {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to prepare envelope.');
        return;
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'prepared' } : s));
      setSelectedSession({ ...selectedSession, status: 'prepared' });
      alert('Envelope prepared for signing. You can now generate the signing link.');
    } catch (err) {
      console.error('Error preparing envelope:', err);
      alert('Failed to prepare envelope.');
    }
  };

  const handleVerifyEnvelope = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/envelope/${sessionId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key'
        },
        body: JSON.stringify({ nameVerified: true, faceVerified: true })
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to verify envelope.');
        return;
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'verified' } : s));
      setSelectedSession({ ...selectedSession, status: 'verified' });
      alert('Envelope verified. You can now prepare or generate the signing link.');
    } catch (err) {
      console.error('Error verifying envelope:', err);
      alert('Failed to verify envelope.');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newRecipientName.trim() || !newRecipientEmail.trim() || newFiles.length === 0) {
      alert('Please provide name, email, and at least one file.');
      return;
    }
    setIsCreatingSession(true);
    try {
      const formData = new FormData();
      formData.append('recipientName', newRecipientName);
      formData.append('recipientEmail', newRecipientEmail);
      newFiles.forEach(file => formData.append('documents', file));
      const response = await fetch(`${API_URL}/api/signing-session`, {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key',
        },
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }
      setIsCreateModalOpen(false);
      setNewRecipientName('');
      setNewRecipientEmail('');
      setNewFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSessions();
      alert('Session created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err) || 'Failed to create session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY || 'your-admin-api-key',
        },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete session');
      }
      fetchSessions();
      alert('Session deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err) || 'Failed to delete session');
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
          <Button onClick={() => setIsCreateModalOpen(true)} variant="outline">Create Session</Button>
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
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-4">No sessions found</TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>{session.id}</TableCell>
                        <TableCell>{session.name}</TableCell>
                        <TableCell>{session.email}</TableCell>
                        <TableCell>{session.status}</TableCell>
                        <TableCell>{new Date(session.created_at).toLocaleString()}</TableCell>
                        <TableCell>{session.expires_at ? new Date(session.expires_at).toLocaleString() : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewSession(session)}>View</Button>
                            {session.status === 'completed' &&
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={downloading === session.id} 
                                onClick={() => handleDownloadDocument(session.id)}
                              >
                                {downloading === session.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Download
                              </Button>
                            }
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSession(session.id)} title="Delete Session">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
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

        {/* Session Details Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Details - {selectedSession?.id}</DialogTitle>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p>{selectedSession.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{selectedSession.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p>{new Date(selectedSession.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expires</p>
                    <p>{selectedSession.expires_at ? new Date(selectedSession.expires_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Envelope Preparation/Verification Actions */}
                {['pending', 'verification_failed', 'expired'].includes(selectedSession.status) && (
                  <div className="flex gap-4 items-center">
                    <Button variant="outline" onClick={() => handleVerifyEnvelope(selectedSession.id)}>
                      Verify Envelope
                    </Button>
                  </div>
                )}
                {selectedSession.status === 'verified' && (
                  <div className="flex gap-4 items-center">
                    <Button variant="outline" onClick={() => handlePrepareEnvelope(selectedSession.id)}>
                      Prepare Envelope
                    </Button>
                  </div>
                )}
                {/* End Preparation/Verification Actions */}

                <div>
                  <h3 className="text-lg font-semibold mb-2">Update Status</h3>
                  <div className="flex gap-4 items-center">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleStatusChange} 
                      disabled={isUpdatingStatus || selectedStatus === selectedSession.status}
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Update Status
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => generateSharableLink(selectedSession.id)}
                    >
                      Share Link
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Documents</h3>
                  {isLoadingDocuments ? (
                    <div className="flex justify-center items-center p-6">
                      <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-2" />
                      <p>Loading documents...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="text-gray-500">No documents found for this session.</p>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="font-medium">{doc.filename}</p>
                              <p className="text-sm text-gray-500">Uploaded: {new Date(doc.uploaded_at).toLocaleString()}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDownloadDocument(selectedSession.id, doc.id)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Session Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Signing Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
                <Input value={newRecipientName} onChange={e => setNewRecipientName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <Input type="email" value={newRecipientEmail} onChange={e => setNewRecipientEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document(s)</label>
                <Input type="file" ref={fileInputRef} multiple accept="application/pdf" onChange={e => setNewFiles(Array.from(e.target.files || []))} required />
              </div>
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isCreatingSession}>Cancel</Button>
                <Button type="submit" disabled={isCreatingSession}>{isCreatingSession ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminPortal;