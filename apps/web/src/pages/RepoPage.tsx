import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reposApi } from '../api';
import RepoStatus from '../components/RepoStatus';
import ChatInterface from '../components/ChatInterface';

export default function RepoPage() {
  const { id } = useParams<{ id: string }>();
  const [isPolling, setIsPolling] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Fetch repository details
  const {
    data: repo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['repo', id],
    queryFn: () => reposApi.get(id!),
    enabled: !!id,
  });

  // Fetch status (for polling during indexing)
  const { data: status } = useQuery({
    queryKey: ['repo-status', id],
    queryFn: () => reposApi.getStatus(id!),
    enabled: !!id && isPolling,
    refetchInterval: isPolling ? 2000 : false,
  });

  // Reindex mutation
  const reindexMutation = useMutation({
    mutationFn: () => reposApi.reindex(id!),
    onSuccess: () => {
      setIsPolling(true);
      refetch();
    },
  });

  // Start polling if status is indexing
  useEffect(() => {
    if (repo?.status === 'indexing' || repo?.status === 'pending') {
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }
  }, [repo?.status]);

  // Stop polling and refetch when status changes to ready
  useEffect(() => {
    if (status?.status === 'ready' || status?.status === 'failed') {
      setIsPolling(false);
      refetch();
    }
  }, [status?.status, refetch]);

  // Create or load a default session when repo becomes ready
  useEffect(() => {
    let mounted = true;
    async function ensureSession() {
      if (!repo || repo.status !== 'ready' || sessionId) return;
      try {
        // Try to list sessions and reuse the most recent one
        const sessions = await reposApi.listSessions(repo.id);
        if (mounted && sessions && sessions.length > 0) {
          setSessionId(sessions[0].id);
          return;
        }

        const res = await reposApi.createSession(repo.id);
        if (mounted) setSessionId(res.sessionId);
      } catch (err) {
        // ignore - session is optional
        console.warn('Failed to create or load chat session', err);
      }
    }

    ensureSession();
    return () => { mounted = false; };
  }, [repo, sessionId]);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading repository...</p>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="text-center py-16">
        <div className="text-red-500 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Repository not found
        </h2>
        <p className="mt-2 text-gray-500">
          The repository you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          Go back home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to repositories
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {repo.owner}/{repo.name}
          </h1>
          <a
            href={repo.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            {repo.githubUrl}
          </a>
        </div>
        <div className="flex items-center space-x-4">
          <RepoStatus
            status={repo.status}
            progress={status?.progress}
          />
          {repo.status === 'ready' && (
            <button
              onClick={() => reindexMutation.mutate()}
              disabled={reindexMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {reindexMutation.isPending ? 'Re-indexing...' : 'Re-index'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {repo.status === 'ready' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Files</p>
            <p className="text-2xl font-semibold text-gray-900">
              {repo.fileCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Chunks</p>
            <p className="text-2xl font-semibold text-gray-900">
              {repo.chunkCount}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Total Size</p>
            <p className="text-2xl font-semibold text-gray-900">
              {formatBytes(repo.totalSize)}
            </p>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {repo.status === 'ready' ? (
        <ChatInterface repositoryId={repo.id} repoName={`${repo.owner}/${repo.name}`} sessionId={sessionId} />
      ) : repo.status === 'indexing' || repo.status === 'pending' ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-500">
            Please wait while we index this repository...
          </p>
        </div>
      ) : (
        <div className="bg-red-50 rounded-lg border border-red-200 p-8 text-center">
          <p className="text-red-600">
            Indexing failed. Please try re-indexing the repository.
          </p>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
