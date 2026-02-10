import React, { useState, useEffect, useCallback } from "react";
import {
  Container, Navbar, Nav, Table, Form, Button, ButtonGroup,
  Alert, OverlayTrigger, Tooltip, Badge
} from "react-bootstrap";
import api from "../api";

// IMPORTANT: Main admin panel component with user management table
// NOTE: Only authenticated, non-blocked users can access this page
function AdminPanel({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusMessage, setStatusMessage] = useState({ text: "", variant: "" });
  const [loading, setLoading] = useState(false);

  // IMPORTANT: Fetch all users from server, sorted by last login time
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
      // NOTE: Clear selections that no longer exist after fetch
      setSelectedIds((prev) => {
        const existingIds = new Set(response.data.map((u) => u.id));
        const newSet = new Set();
        prev.forEach((id) => {
          if (existingIds.has(id)) newSet.add(id);
        });
        return newSet;
      });
    } catch (err) {
      // NOTA BENE: If fetch fails due to auth, interceptor handles redirect
      if (!err.response?.data?.redirect) {
        showMessage("Failed to load users", "danger");
      }
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // NOTE: Helper to show status messages that auto-dismiss
  function showMessage(text, variant) {
    setStatusMessage({ text, variant });
    setTimeout(() => setStatusMessage({ text: "", variant: "" }), 4000);
  }

  // IMPORTANT: Toggle selection of a single user checkbox
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // IMPORTANT: Select all or deselect all users via header checkbox
  function toggleSelectAll() {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  }

  // NOTE: Check if all users are selected (for header checkbox state)
  const allSelected = users.length > 0 && selectedIds.size === users.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < users.length;

  // IMPORTANT: Block selected users
  async function handleBlock() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const response = await api.post("/users/block", { userIds: Array.from(selectedIds) });
      showMessage(response.data.message, "success");
      // NOTA BENE: If current user blocked themselves, logout
      if (response.data.selfBlocked) {
        setTimeout(() => onLogout(), 1500);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to block users", "danger");
    } finally {
      setLoading(false);
    }
  }

  // IMPORTANT: Unblock selected users
  async function handleUnblock() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const response = await api.post("/users/unblock", { userIds: Array.from(selectedIds) });
      showMessage(response.data.message, "success");
      await fetchUsers();
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to unblock users", "danger");
    } finally {
      setLoading(false);
    }
  }

  // IMPORTANT: Delete selected users — removes them from the database entirely
  async function handleDelete() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const response = await api.post("/users/delete", { userIds: Array.from(selectedIds) });
      showMessage(response.data.message, "success");
      // NOTE: If current user deleted themselves, logout
      if (response.data.selfDeleted) {
        setTimeout(() => onLogout(), 1500);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to delete users", "danger");
    } finally {
      setLoading(false);
    }
  }

  // IMPORTANT: Delete all unverified users at once
  async function handleDeleteUnverified() {
    setLoading(true);
    try {
      const response = await api.post("/users/delete-unverified");
      showMessage(response.data.message, "success");
      if (response.data.selfDeleted) {
        setTimeout(() => onLogout(), 1500);
      } else {
        await fetchUsers();
      }
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to delete unverified users", "danger");
    } finally {
      setLoading(false);
    }
  }

  // NOTE: Format date for display in the table
  function formatDate(dateString) {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  // NOTE: Render status badge with appropriate color
  function renderStatusBadge(status) {
    const variants = {
      active: "success",
      blocked: "danger",
      unverified: "warning",
    };
    return (
      <Badge bg={variants[status] || "secondary"} className="text-capitalize">
        {status}
      </Badge>
    );
  }

  // NOTE: Helper to render tooltip wrapper
  function renderTooltip(text) {
    return <Tooltip>{text}</Tooltip>;
  }

  const hasSelection = selectedIds.size > 0;

  return (
    <>
      {/* IMPORTANT: Navigation bar with app title, user info, and logout */}
      <Navbar bg="dark" variant="dark" className="mb-0">
        <Container fluid>
          <Navbar.Brand>User Management</Navbar.Brand>
          <Nav className="ms-auto align-items-center">
            <Navbar.Text className="me-3">
              Signed in as: <strong>{user?.name}</strong>
            </Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </Nav>
        </Container>
      </Navbar>

      <Container fluid className="p-3">
        {/* NOTE: Status message display for operation results */}
        {statusMessage.text && (
          <Alert
            variant={statusMessage.variant}
            dismissible
            onClose={() => setStatusMessage({ text: "", variant: "" })}
          >
            {statusMessage.text}
          </Alert>
        )}

        {/* IMPORTANT: Toolbar with Block, Unblock, Delete, Delete Unverified actions */}
        {/* NOTA BENE: Toolbar is always visible, buttons are enabled/disabled based on selection */}
        <div className="d-flex align-items-center gap-2 mb-3 p-2 bg-light border rounded">
          <OverlayTrigger placement="bottom" overlay={renderTooltip("Block selected users")}>
            <Button
              variant="warning"
              size="sm"
              onClick={handleBlock}
              disabled={!hasSelection || loading}
            >
              <i className="bi bi-lock-fill me-1"></i>
              Block
            </Button>
          </OverlayTrigger>

          <OverlayTrigger placement="bottom" overlay={renderTooltip("Unblock selected users")}>
            <Button
              variant="outline-success"
              size="sm"
              onClick={handleUnblock}
              disabled={!hasSelection || loading}
            >
              <i className="bi bi-unlock-fill"></i>
            </Button>
          </OverlayTrigger>

          <OverlayTrigger placement="bottom" overlay={renderTooltip("Delete selected users")}>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleDelete}
              disabled={!hasSelection || loading}
            >
              <i className="bi bi-trash-fill"></i>
            </Button>
          </OverlayTrigger>

          <OverlayTrigger placement="bottom" overlay={renderTooltip("Delete all unverified users")}>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleDeleteUnverified}
              disabled={loading}
            >
              <i className="bi bi-person-x-fill"></i>
            </Button>
          </OverlayTrigger>
        </div>

        {/* IMPORTANT: User management table */}
        {/* NOTE: Data is sorted by last login time (server-side) */}
        {/* NOTA BENE: No buttons in data rows — all actions are in the toolbar */}
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th style={{ width: "40px" }}>
                {/* IMPORTANT: Select all / deselect all checkbox */}
                <Form.Check
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  title="Select all / Deselect all"
                />
              </th>
              <th>Name</th>
              <th>E-mail</th>
              <th>Last Login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={selectedIds.has(u.id) ? "table-active" : ""}>
                  <td>
                    <Form.Check
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{formatDate(u.last_login)}</td>
                  <td>{renderStatusBadge(u.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default AdminPanel;
