document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Simple HTML-escape to avoid injection when inserting participant names/emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select options (keep default)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section: list with delete buttons
        const participantsHTML =
          details.participants && details.participants.length
            ? `<ul class="participants-list">${details.participants
                .map(
                  (p) =>
                    `<li class="participant-item"><span class="participant-name">${escapeHtml(
                      p
                    )}</span><button class="remove-participant" data-activity="${escapeHtml(
                      name
                    )}" data-email="${escapeHtml(p)}" title="Remove participant">✕</button></li>`
                )
                .join("")}</ul>`
            : `<p class="no-participants">No participants yet — be the first!</p>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant is shown immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation for remove-participant buttons
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".remove-participant");
    if (!btn) return;

    const activity = btn.getAttribute("data-activity");
    const email = btn.getAttribute("data-email");

    if (!activity || !email) return;

    // Confirm before deleting
    const confirmed = window.confirm(`Remove ${email} from ${activity}?`);
    if (!confirmed) return;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants/${encodeURIComponent(
          email
        )}`,
        { method: "DELETE" }
      );

      const result = await resp.json().catch(() => ({}));

      if (resp.ok) {
        // Refresh activities to reflect removal
        await fetchActivities();
        messageDiv.textContent = result.message || "Participant removed";
        messageDiv.className = "success";
      } else {
        messageDiv.textContent = result.detail || result.message || "Failed to remove participant";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Error removing participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    }
  });

  // Initialize app
  fetchActivities();
});
