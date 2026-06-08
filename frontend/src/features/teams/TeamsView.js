import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import PermissionGuard from '../../components/PermissionGuard';
import teamService from '../../services/teamService';

const createPlayerRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  surname: '',
  number: '',
  size: '',
  type: '',
});

const createInitialFormData = () => ({
  teamName: '',
  quantity: '1',
  transitDate: new Date().toISOString().split('T')[0],
  players: [createPlayerRow()],
});

const TeamsView = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState(createInitialFormData());

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await teamService.getAllTeams();
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      alert('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      quantity: String(prev.players.length),
    }));
  }, [formData.players]);

  const resetForm = () => {
    setEditingTeam(null);
    setFormData(createInitialFormData());
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      teamName: team.teamName || '',
      quantity: team.players?.length != null ? String(team.players.length) : '1',
      transitDate: team.transitDate || new Date().toISOString().split('T')[0],
      players:
        team.players && team.players.length > 0
          ? team.players.map((player) => ({
              id: player.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              surname: player.surname || '',
              number: player.number || '',
              size: player.size || '',
              type: player.type || '',
            }))
          : [createPlayerRow()],
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await teamService.deleteTeam(id);
      alert('Team deleted successfully');
      loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete team';
      alert(`Failed to delete team: ${errorMessage}`);
    }
  };

  const handlePlayerChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      players: prev.players.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player
      ),
    }));
  };

  const addPlayerRow = () => {
    setFormData((prev) => ({
      ...prev,
      players: [...prev.players, createPlayerRow()],
    }));
  };

  const removePlayerRow = (index) => {
    setFormData((prev) => {
      const nextPlayers = prev.players.filter((_, playerIndex) => playerIndex !== index);
      return {
        ...prev,
        players: nextPlayers.length > 0 ? nextPlayers : [createPlayerRow()],
      };
    });
  };

  const handleSubmit = async () => {
    try {
      const teamName = formData.teamName.trim();
      const transitDate = formData.transitDate;

      if (!teamName) {
        alert('Please enter a team name.');
        return;
      }

      if (!transitDate) {
        alert('Please select a transit date.');
        return;
      }

      const normalizedPlayers = formData.players.map((player) => ({
        surname: player.surname.trim(),
        number: player.number.trim(),
        size: player.size.trim(),
        type: player.type.trim(),
      }));

      const hasIncompletePlayer = normalizedPlayers.some(
        (player) => !player.surname || !player.number || !player.size || !player.type
      );

      if (normalizedPlayers.length === 0 || hasIncompletePlayer) {
        alert('Please complete all player fields before saving.');
        return;
      }

      const payload = {
        teamName,
        quantity: normalizedPlayers.length,
        transitDate,
        players: normalizedPlayers,
      };

      if (editingTeam) {
        await teamService.updateTeam(editingTeam.id, payload);
        alert('Team updated successfully');
      } else {
        await teamService.createTeam(payload);
        alert('Team created successfully');
      }

      setModalOpen(false);
      resetForm();
      loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save team';
      alert(`Failed to save team: ${errorMessage}`);
    }
  };

  const filteredTeams = teams.filter((team) => {
    const haystack = [
      team.teamName,
      team.quantity,
      team.transitDate,
      ...(team.players || []).flatMap((player) => [
        player.surname,
        player.number,
        player.size,
        player.type,
      ]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchQuery.trim().toLowerCase());
  });

  const columns = [
    { key: 'teamName', label: 'Team Name' },
    { key: 'quantity', label: 'Quantity' },
    {
      key: 'transitDate',
      label: 'Transit Date',
    },
    {
      key: 'players',
      label: 'Players',
      render: (value) => `${value?.length || 0} player(s)`,
    },
  ];

  return (
    <PermissionGuard permission="ORDERS">
      <DashboardLayout>
        <div className="page-container">
          <div className="page-header">
            <h1>Teams</h1>
            <button className="btn-primary" onClick={openCreateModal} type="button">
              + Create Team
            </button>
          </div>

          <div className="client-search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams, players, sizes, or numbers"
            />
          </div>

          <DataTable
            columns={columns}
            data={filteredTeams}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            currentPage={1}
            totalPages={1}
            onPageChange={() => {}}
          />

          <Modal
            isOpen={modalOpen}
            title={editingTeam ? 'Edit Team' : 'Create Team'}
            onClose={() => setModalOpen(false)}
            onSubmit={handleSubmit}
            submitText={editingTeam ? 'Update' : 'Create'}
            size="large"
          >
            <form className="order-form-grid">
              <div className="form-group">
                <label>Team Name *</label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  placeholder="Enter team name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  readOnly
                  disabled
                  placeholder="Auto-calculated from players"
                />
                <small className="form-help-text">This updates automatically based on the number of players.</small>
              </div>

              <div className="form-group">
                <label>Transit Date *</label>
                <input
                  type="date"
                  value={formData.transitDate}
                  onChange={(e) => setFormData({ ...formData, transitDate: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Players *</label>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {formData.players.map((player, index) => (
                    <div
                      key={player.id || index}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        background: '#fafafa',
                      }}
                    >
                      <div className="order-form-grid" style={{ marginBottom: 0 }}>
                        <div className="form-group">
                          <label>Surname *</label>
                          <input
                            type="text"
                            value={player.surname}
                            onChange={(e) => handlePlayerChange(index, 'surname', e.target.value)}
                            placeholder="Enter surname"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Number *</label>
                          <input
                            type="text"
                            value={player.number}
                            onChange={(e) => handlePlayerChange(index, 'number', e.target.value)}
                            placeholder="Enter number"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Size *</label>
                          <input
                            type="text"
                            value={player.size}
                            onChange={(e) => handlePlayerChange(index, 'size', e.target.value)}
                            placeholder="Enter size"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Type *</label>
                          <input
                            type="text"
                            value={player.type}
                            onChange={(e) => handlePlayerChange(index, 'type', e.target.value)}
                            placeholder="Enter type"
                            required
                          />
                        </div>
                      </div>

                      {formData.players.length > 1 && (
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => removePlayerRow(index)}
                        >
                          Remove Player
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={addPlayerRow}
                  style={{ marginTop: '12px' }}
                >
                  + Add more players?
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
};

export default TeamsView;
