import React from 'react';
import '../styles/DataTable.css';

const DataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  onView,
  canEdit,
  canDelete,
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) => {
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="no-data">No records found</div>;
  }

  return (
    <div className="datatable-container">
      <table className="datatable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id || idx}>
              {columns.map((col) => (
                <td key={`${col.key}-${idx}`}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              <td className="actions">
                {onView && (
                  <button
                    className="btn-view"
                    onClick={() => onView(row)}
                    title="Details"
                    type="button"
                  >
                    Details
                  </button>
                )}
                {onEdit && (!canEdit || canEdit(row)) && (
                  <button
                    className="btn-edit"
                    onClick={() => onEdit(row)}
                    title="Edit"
                    type="button"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (!canDelete || canDelete(row)) && (
                  <button
                    className="btn-delete"
                    onClick={() => {
                      if (window.confirm('Are you sure?')) {
                        onDelete(row.id);
                      }
                    }}
                    title="Delete"
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DataTable;
