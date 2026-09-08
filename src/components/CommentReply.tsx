import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useMainContext } from "../MainContext";
import useMutate from "../hooks/useMutate";
import { draftKey, loadDraft, saveDraft } from "../../lib/drafts";

const ReactMarkdown = dynamic<{ children: string }>(() => import("react-markdown"));

export default function CommentReply({
  parent,
  postName,
  getResponse,
  onCancel = () => {},
  initialValue = "",
  mode = "REPLY",
}: {
  parent: string;
  postName: String;
  getResponse: (response: any) => void;
  onCancel?: (event?: React.MouseEvent) => void;
  initialValue?: string;
  mode?: "REPLY" | "EDIT";
}) {
  const { data: session } = useSession();
  const context: any = useMainContext();
  const { postCommentMutation, editCommentMutation } = useMutate();
  const [text, setText] = useState(initialValue);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const key = session?.user?.name
    ? draftKey(session.user.name, mode, parent, String(postName))
    : null;
  const busy = postCommentMutation.isLoading || editCommentMutation.isLoading;

  useEffect(() => {
    const saved = key ? loadDraft(localStorage, key) : null;
    setText(saved ?? initialValue);
    setMessage(
      saved !== null ? "Draft restored on this device" : "Markdown supported",
    );
  }, [key, initialValue]);
  useEffect(() => () => context.setReplyFocus(false), [context.setReplyFocus]);

  const changeText = (value: string) => {
    setText(value);
    if (key)
      setMessage(
        saveDraft(localStorage, key, value)
          ? "Draft saved on this device"
          : "Draft could not be saved — keep this page open",
      );
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!session || !text.trim() || busy) return;
    setError("");
    try {
      const response =
        mode === "EDIT"
          ? await editCommentMutation.mutateAsync({ parent, text })
          : await postCommentMutation.mutateAsync({
              parent,
              textValue: text,
              postName,
            });
      if (!response || (mode === "EDIT" && !response.body_html))
        throw new Error("No confirmation received");
      if (key) saveDraft(localStorage, key, "");
      setText("");
      setMessage("Comment saved");
      if (mode === "EDIT" || !parent.startsWith("t3_")) getResponse(response);
    } catch (_) {
      setError(
        "Couldn’t save your comment. Your draft is still here; try again when you’re ready.",
      );
    }
  };
  if (!session?.user?.name) return null;
  return (
    <form className="comment-composer" onSubmit={submit}>
      <div className="composer-heading">
        <label htmlFor={`reply-${parent}-${mode}`}>
          {mode === "EDIT"
            ? "Edit your comment"
            : `Reply as u/${session.user.name}`}
        </label>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? "Write" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="composer-preview prose prose-sm max-w-none">
          <ReactMarkdown>{text || "Nothing to preview yet."}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          id={`reply-${parent}-${mode}`}
          aria-label={mode === "EDIT" ? "Edit comment" : "Write a comment"}
          placeholder="Add to the conversation…"
          value={text}
          disabled={busy}
          onFocus={() => context.setReplyFocus(true)}
          onBlur={() => context.setReplyFocus(false)}
          onChange={(event) => changeText(event.target.value)}
        />
      )}
      <div className="composer-footer">
        <span role="status">{message}</span>
        <button
          type="button"
          className="settings-action"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="primary-button"
          disabled={busy || !text.trim()}
        >
          {busy ? "Saving…" : mode === "EDIT" ? "Save changes" : "Comment"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-th-red" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
