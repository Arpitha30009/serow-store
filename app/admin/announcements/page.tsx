
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Announcement = {
  message: string;
  is_enabled: boolean;
};

const DEFAULT_MESSAGE = "QUIET LUXURY · TIMELESS STYLE";

export default function AnnouncementsPage() {
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const response = await fetch("/api/admin/announcement", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load settings.");
        }

        setMessage(result.message ?? DEFAULT_MESSAGE);
        setIsEnabled(result.is_enabled ?? true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load settings."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnnouncement();
  }, []);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!message.trim() || message.trim().length > 200) {
      setError("Enter a message between 1 and 200 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          is_enabled: isEnabled,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save announcement.");
      }

      setMessage(result.announcement.message);
      setIsEnabled(result.announcement.is_enabled);
      setSuccess("Announcement settings saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="announcement-admin">
      <div className="announcement-admin__top">
        <Link href="/admin" className="announcement-admin__back">
          ← Back to Dashboard
        </Link>

        <p className="announcement-admin__eyebrow">
          SEROW · STORE SETTINGS
        </p>
        <h1>Announcement Bar</h1>
        <p className="announcement-admin__description">
          Manage the message displayed at the top of your storefront.
        </p>
      </div>

      {loading ? (
        <p className="announcement-admin__status">Loading settings...</p>
      ) : (
        <div className="announcement-admin__grid">
          <form
            className="announcement-admin__panel"
            onSubmit={handleSave}
          >
            <label
              className="announcement-admin__label"
              htmlFor="announcement-message"
            >
              Announcement message
            </label>

            <textarea
              id="announcement-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={200}
              rows={4}
              placeholder="Enter your announcement..."
              required
            />

            <div className="announcement-admin__counter">
              {message.length}/200 characters
            </div>

            <label className="announcement-admin__toggle">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
              />
              <span>
                <strong>Show announcement bar</strong>
                <small>
                  Turn this off to hide the message from your storefront.
                </small>
              </span>
            </label>

            {error && (
              <p className="announcement-admin__message announcement-admin__error">
                {error}
              </p>
            )}

            {success && (
              <p className="announcement-admin__message announcement-admin__success">
                {success}
              </p>
            )}

            <button
              type="submit"
              className="announcement-admin__save"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <section className="announcement-admin__panel">
            <p className="announcement-admin__label">Live preview</p>

            <div className="announcement-admin__preview-wrap">
              {isEnabled && message.trim() ? (
                <div className="announcement-admin__preview">
                  {message.trim()}
                </div>
              ) : (
                <div className="announcement-admin__hidden">
                  Announcement bar is hidden
                </div>
              )}
            </div>

            <p className="announcement-admin__hint">
              Save your changes before leaving this page.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
