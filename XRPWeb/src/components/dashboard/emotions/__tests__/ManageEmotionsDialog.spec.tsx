import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

vi.mock("../customEmotionStore", () => ({
  createEmotionSpriteUrl: vi.fn(() => ""),
  deleteCustomEmotion: vi.fn(async () => undefined),
  findNextCustomEmotionId: vi.fn(async () => 128),
  listCustomEmotions: vi.fn(async () => []),
  saveCustomEmotion: vi.fn(async () => undefined),
}));

vi.mock("../customEmotionEvents", () => ({
  notifyCustomEmotionsChanged: vi.fn(),
}));

vi.mock("../xrpRedVisionUploadService", () => ({
  deleteCustomEmotionFromRedVision: vi.fn(async () => undefined),
  releaseExistingUsbConnectionForRedVisionUpload: vi.fn(async () => false),
  uploadCustomEmotionToRedVision: vi.fn(async () => undefined),
}));

import {
  deleteCustomEmotion,
  listCustomEmotions,
} from "../customEmotionStore";
import type { CustomEmotionRecord } from "../customEmotionTypes";
import { deleteCustomEmotionFromRedVision } from "../xrpRedVisionUploadService";
import ManageEmotionsDialog from "../ManageEmotionsDialog";

describe("ManageEmotionsDialog animation controls", () => {
  it("enforces single-image defaults and reveals only applicable controls", async () => {
    render(
      <ManageEmotionsDialog
        isOpen
        onClose={vi.fn()}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const sourceType = screen.getByRole("combobox", {
      name: /Source type/i,
    });
    const totalFrames = screen.getByRole("spinbutton", {
      name: /Total frames/i,
    });
    const repeatMode = screen.getByRole("combobox", {
      name: /Repeat mode/i,
    });

    expect(totalFrames).toBeDisabled();
    expect(totalFrames).toHaveValue(1);
    expect(repeatMode).toBeDisabled();
    expect(repeatMode).toHaveValue("once");
    expect(
      screen.queryByRole("spinbutton", { name: /Repeat count/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Default FPS/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /Fit mode/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(sourceType, {
      target: { value: "horizontal_spritesheet" },
    });

    expect(totalFrames).toBeEnabled();
    expect(repeatMode).toBeEnabled();
    expect(
      screen.getByRole("spinbutton", { name: /Default FPS/i }),
    ).toHaveValue(1);
    expect(
      screen.queryByRole("spinbutton", { name: /Repeat count/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(repeatMode, {
      target: { value: "count" },
    });

    expect(
      screen.getByRole("spinbutton", { name: /Repeat count/i }),
    ).toHaveValue(1);

    fireEvent.change(sourceType, {
      target: { value: "single_image" },
    });

    expect(totalFrames).toBeDisabled();
    expect(totalFrames).toHaveValue(1);
    expect(repeatMode).toBeDisabled();
    expect(repeatMode).toHaveValue("once");
    expect(
      screen.queryByRole("spinbutton", { name: /Repeat count/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: /Default FPS/i }),
    ).not.toBeInTheDocument();
  });

  it("shows deletion success in a dismissible confirmation dialog", async () => {
    const record: CustomEmotionRecord = {
      schemaVersion: 1,
      uniqueName: "test_emotion",
      displayName: "Test Emotion",
      emotionId: 128,
      spriteBlob: new Blob(["png"], { type: "image/png" }),
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      defaultFps: 1,
      repeatMode: "once",
      repeatCount: null,
      createdAt: 1,
      updatedAt: 1,
      soundMode: "none",
      soundBlob: null,
    };

    vi.mocked(listCustomEmotions)
      .mockResolvedValueOnce([record])
      .mockResolvedValue([]);
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);

    render(
      <ManageEmotionsDialog
        isOpen
        onClose={vi.fn()}
      />,
    );

    await screen.findByText("Test Emotion");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByRole("heading", { name: "Emotion deleted" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Deleted successfully from this browser and XRP Red Vision.",
      ),
    ).toBeInTheDocument();
    expect(deleteCustomEmotionFromRedVision).toHaveBeenCalledWith(
      "test_emotion",
      expect.any(Object),
    );
    expect(deleteCustomEmotion).toHaveBeenCalledWith("test_emotion");

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Emotion deleted" }),
      ).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
