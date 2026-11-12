"use client"
import { UserInputDao } from "@/libs/models/auth/dao/userCreationModel";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";

export default function RegisterPage() {
  const { t } = useLingui();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const router = useRouter();

  const { data: session, update } = useSession();
  // Registering while signed in as a guest claims that account rather than
  // making a second one, so everything already answered comes along.
  const isGuest = session?.user?.isAnonymous === true;

    const postNewUser = (userRegistrationInfo: UserInputDao) => {
    return fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userRegistrationInfo)
    }).then(async response => {
      if (!response.ok) {
        // The server distinguishes a taken email from a malformed request;
        // throwing the status alone would throw that away.
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? t`Registration failed`);
      }
      return response.json();
    });
  };

  const surveyMutation = useMutation({
    mutationFn: postNewUser,
    mutationKey: ['regiserUser']
  });

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    surveyMutation.mutate({email, password}, {
      onSuccess: async () => {
        if (isGuest) {
          // The guest is already signed in as this very user, so there is
          // nothing to log into — just refresh the session so it stops
          // reporting them as a guest.
          await update();
          router.replace("/surveys");
          router.refresh();
        } else {
          router.replace("/login");
        }
      }
    });
  };

  const errorMessage = mismatch
    ? t`Passwords do not match.`
    : surveyMutation.error?.message ?? null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <h1 className="text-4xl font-bold mb-8">Surveyor</h1>

      <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
        <h2 className="text-2xl font-semibold mb-2 text-center">
          {isGuest ? <Trans>Claim your answers</Trans> : <Trans>Register</Trans>}
        </h2>
        {isGuest && (
          <p className="mb-6 text-sm text-center text-gray-500 dark:text-gray-400">
            <Trans>
              You&apos;ve been answering as a guest. Creating an account keeps the answers
              you have already given.
            </Trans>
          </p>
        )}
        {errorMessage && (
          <p
            role="alert"
            className="mb-4 text-sm text-center text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </p>
        )}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              <Trans>Email</Trans>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder={t`you@example.com`}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              <Trans>Password</Trans>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              <Trans>Confirm Password</Trans>
            </label>
            <input
              onBlur={(e) => {
                if (confirmPassword === password && confirmPassword !== "") {
                  e.target.style.outline = "2px solid green";
                } else if (confirmPassword !== password) {
                  e.target.style.outline = "2px solid red";
                } else {
                  e.target.style.outline = "none";
                }
              }}

              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={surveyMutation.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {surveyMutation.isPending ? <Trans>Creating...</Trans> : <Trans>Create Account</Trans>}
          </button>
        </form>
      </div>
    </div>
  );
}
