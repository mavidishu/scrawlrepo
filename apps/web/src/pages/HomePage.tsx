import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reposApi, Repository } from '../api';
import RepoInput from '../components/RepoInput';
import RepoList from '../components/RepoList';
import ConfirmModal from '../components/ConfirmModal';

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories
  const { data, isLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: () => reposApi.list(1, 50),
  });

  // Create repository mutation
  const createMutation = useMutation({
    mutationFn: (githubUrl: string) => reposApi.create(githubUrl),
    onSuccess: (repo) => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      navigate(`/repos/${repo.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Delete repository mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reposApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
    },
  });

  const handleSubmit = (url: string) => {
    setError(null);
    createMutation.mutate(url);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [selectedRepoName, setSelectedRepoName] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const repo = data?.items?.find((r: Repository) => r.id === id);
    setSelectedRepoId(id);
    setSelectedRepoName(repo ? `${repo.owner}/${repo.name}` : null);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedRepoId) {
      deleteMutation.mutate(selectedRepoId);
    }
    setShowDeleteModal(false);
    setSelectedRepoId(null);
    setSelectedRepoName(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedRepoId(null);
    setSelectedRepoName(null);
  };

  const handleSelect = (repo: Repository) => {
    navigate(`/repos/${repo.id}`);
  };

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete repository"
        description={
          selectedRepoName
            ? `Are you sure you want to delete ${selectedRepoName}? This action cannot be undone.`
            : 'Are you sure you want to delete this repository? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Understand Any GitHub Repository
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Paste a public GitHub repository URL and ask questions about the codebase.
          Our AI will analyze the code and provide intelligent answers.
        </p>
      </div>

      {/* Input Section */}
      <div className="max-w-2xl mx-auto">
        <RepoInput
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          error={error}
        />
      </div>

      {/* Repository List */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Your Repositories
        </h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading repositories...</p>
          </div>
        ) : data?.items && data.items.length > 0 ? (
          <RepoList
            repositories={data.items}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No repositories yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a GitHub repository above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
