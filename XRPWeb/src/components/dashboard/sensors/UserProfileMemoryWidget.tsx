import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCheck,
  FaTrash,
  FaUser,
  FaUserPlus,
} from "react-icons/fa";

import SensorCard from "./SensorCard";
import { useGridStackWidget } from "../hooks/useGridStackWidget";

import {
  addFactsToUserProfile,
  deleteUserProfile,
  getActiveUserProfileId,
  getUserProfiles,
  learnFromProfileText,
  removeFactFromUserProfile,
  setActiveUserProfileId,
  USER_PROFILE_CHANGED_EVENT,
  type UserProfile,
} from "../profiles/userProfileStore";


const exampleText =
  "Hola soy Miguel, soy de Colombia, me gusta el helado y me gusta el fútbol.";


const panelClass =
  "rounded-xl border border-white bg-black p-3 text-white";

const inputClass =
  "min-w-0 rounded border border-white bg-black px-2 py-1 text-xs text-white placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-white";

const buttonClass =
  "rounded border border-white bg-black px-3 py-1 font-bold text-white transition hover:bg-white hover:text-black";

const dangerButtonClass =
  "rounded border border-red-400 bg-black p-2 text-red-300 transition hover:bg-red-500 hover:text-white";


const UserProfileMemoryWidget:
  React.FC = () => {
  const { handleDelete } =
    useGridStackWidget();

  const [
    profiles,
    setProfiles,
  ] = useState<UserProfile[]>([]);

  const [
    activeProfileId,
    setActiveProfileIdState,
  ] = useState<string | null>(null);

  const [
    newProfileName,
    setNewProfileName,
  ] = useState("");

  const [
    manualFact,
    setManualFact,
  ] = useState("");

  const [
    learnText,
    setLearnText,
  ] = useState(exampleText);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const refreshProfiles = (): void => {
    setProfiles(
      getUserProfiles()
    );

    setActiveProfileIdState(
      getActiveUserProfileId()
    );
  };

  useEffect(() => {
    refreshProfiles();

    const handleChanged = (): void => {
      refreshProfiles();
    };

    window.addEventListener(
      USER_PROFILE_CHANGED_EVENT,
      handleChanged
    );

    window.addEventListener(
      "storage",
      handleChanged
    );

    return () => {
      window.removeEventListener(
        USER_PROFILE_CHANGED_EVENT,
        handleChanged
      );

      window.removeEventListener(
        "storage",
        handleChanged
      );
    };
  }, []);

  const activeProfile =
    useMemo(
      () =>
        profiles.find(
          (profile) =>
            profile.id === activeProfileId
        ) ?? null,
      [
        profiles,
        activeProfileId,
      ]
    );

  const handleSetActive = (
    profileId: string
  ): void => {
    setActiveUserProfileId(
      profileId
    );

    setStatusMessage(
      "Active user updated."
    );
  };

  const handleCreateProfile = (): void => {
    const clean =
      newProfileName.trim();

    if (!clean) {
      return;
    }

    const profile =
      learnFromProfileText(
        `Soy ${clean}`
      );

    if (profile) {
      setActiveUserProfileId(
        profile.id
      );

      setStatusMessage(
        `Created profile for ${profile.displayName}.`
      );
    }

    setNewProfileName("");
  };

  const handleLearnText = (): void => {
    const learned =
      learnFromProfileText(
        learnText,
        activeProfileId ?? undefined
      );

    if (!learned) {
      setStatusMessage(
        "Could not learn. Create or select a profile first."
      );
      return;
    }

    setActiveUserProfileId(
      learned.id
    );

    setStatusMessage(
      `Memory updated for ${learned.displayName}.`
    );
  };

  const handleAddManualFact = (): void => {
    if (
      !activeProfile ||
      !manualFact.trim()
    ) {
      return;
    }

    addFactsToUserProfile(
      activeProfile.id,
      [
        manualFact,
      ],
      "manual"
    );

    setManualFact("");
    setStatusMessage(
      `Added fact to ${activeProfile.displayName}.`
    );
  };

  const handleDeleteProfile = (
    profileId: string
  ): void => {
    if (
      !window.confirm(
        "Delete this profile and its saved facts?"
      )
    ) {
      return;
    }

    deleteUserProfile(
      profileId
    );

    setStatusMessage(
      "Profile deleted."
    );
  };

  const handleRemoveFact = (
    factId: string
  ): void => {
    if (!activeProfile) {
      return;
    }

    removeFactFromUserProfile(
      activeProfile.id,
      factId
    );

    setStatusMessage(
      "Fact removed."
    );
  };

  const isConnected =
    profiles.length > 0;

  return (
    <SensorCard
      title="User Memory"
      icon={<FaUser size={16} />}
      onStart={() => {}}
      onStop={() => {}}
      isConnected={isConnected}
      lastUpdated={
        activeProfile?.updatedAt
      }
    >
      <div className="absolute right-4 top-4">
        <button
          onClick={handleDelete}
          className={dangerButtonClass}
          title="Delete widget"
          type="button"
        >
          <FaTrash size={12} />
        </button>
      </div>

      <div className="flex h-full w-full flex-col gap-3 overflow-auto rounded-xl bg-black p-3 pt-10 text-xs text-white">
        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Create profile
          </div>

          <div className="flex gap-2">
            <input
              value={newProfileName}
              onChange={(event) =>
                setNewProfileName(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCreateProfile();
                }
              }}
              placeholder="Miguel"
              className={`${inputClass} flex-1`}
            />

            <button
              type="button"
              onClick={handleCreateProfile}
              className={buttonClass}
              title="Create profile"
            >
              <FaUserPlus size={12} />
            </button>
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Profiles
          </div>

          {profiles.length === 0 ? (
            <div className="text-zinc-300">
              No profiles yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={[
                    "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-white",
                    profile.id === activeProfileId
                      ? "border-green-300 bg-green-950"
                      : "border-white bg-black",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleSetActive(
                        profile.id
                      )
                    }
                    className="min-w-0 flex-1 truncate text-left font-semibold text-white hover:underline"
                  >
                    {profile.displayName}
                  </button>

                  {profile.id === activeProfileId && (
                    <span
                      className="rounded border border-green-300 bg-black px-1.5 py-0.5 text-[10px] font-bold text-green-200"
                      title="Active user"
                    >
                      Active
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteProfile(
                        profile.id
                      )
                    }
                    className="rounded border border-red-400 bg-black px-1.5 py-1 text-red-300 hover:bg-red-500 hover:text-white"
                    title="Delete profile"
                  >
                    <FaTrash size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={panelClass}>
          <div className="mb-2 font-bold text-white">
            Quick learn from text
          </div>

          <textarea
            value={learnText}
            onChange={(event) =>
              setLearnText(
                event.target.value
              )
            }
            rows={3}
            className={`${inputClass} w-full resize-none`}
            placeholder={exampleText}
          />

          <button
            type="button"
            onClick={handleLearnText}
            className={`${buttonClass} mt-2 flex items-center gap-2`}
          >
            <FaCheck size={10} />
            Learn
          </button>

          <div className="mt-2 text-[10px] leading-4 text-zinc-300">
            Example: “Hola soy Miguel, soy de Colombia, me gusta el fútbol.”
          </div>
        </div>

        {activeProfile && (
          <div className={panelClass}>
            <div className="mb-2 font-bold text-white">
              Memory for {activeProfile.displayName}
            </div>

            <div className="flex gap-2">
              <input
                value={manualFact}
                onChange={(event) =>
                  setManualFact(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleAddManualFact();
                  }
                }}
                placeholder="Miguel likes football"
                className={`${inputClass} flex-1`}
              />

              <button
                type="button"
                onClick={handleAddManualFact}
                className={buttonClass}
              >
                Add
              </button>
            </div>

            {activeProfile.facts.length === 0 ? (
              <div className="mt-3 text-zinc-300">
                No saved facts yet.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-1.5">
                {activeProfile.facts.map((fact) => (
                  <div
                    key={fact.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-white bg-black px-2 py-1.5 text-white"
                  >
                    <div className="min-w-0">
                      <div className="text-white">
                        {fact.text}
                      </div>

                      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                        {fact.source}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveFact(
                          fact.id
                        )
                      }
                      className="rounded border border-red-400 bg-black px-1.5 py-1 text-red-300 hover:bg-red-500 hover:text-white"
                      title="Remove fact"
                    >
                      <FaTrash size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {statusMessage && (
          <div className="rounded-lg border border-white bg-black px-3 py-2 font-semibold text-white">
            {statusMessage}
          </div>
        )}

        <div className="rounded-xl border border-white bg-black p-3 text-[10px] leading-4 text-white">
          This is local memory only. It is stored in this browser using localStorage.
          It will be used later by Robot Chat, camera identity and custom emotion keywords.
        </div>
      </div>
    </SensorCard>
  );
};


export default UserProfileMemoryWidget;
