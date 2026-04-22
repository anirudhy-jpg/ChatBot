import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { ChatLayout } from "./components/chat/ChatLayout";
import { ChatProvider } from "./contexts/ChatContext";

function App() {
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-700">
        Add `VITE_CLERK_PUBLISHABLE_KEY` to the frontend environment to enable Clerk.
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <SignIn />
        </div>
      </SignedOut>

      <SignedIn>
        <ChatProvider>
          <ChatLayout />
        </ChatProvider>
      </SignedIn>
    </>
  );
}

export default App;
