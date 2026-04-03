import { redirect } from "next/navigation";
import { ChangeDisplayNameForm } from "./_components/ChangeDisplayNameForm";
import { getServerSession } from "next-auth";

export default async function Settings() {
  const session = await getServerSession();
  const user = session?.user;
  if (!user) {
    redirect("/login");
  }
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Profile</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <div className="mt-1">
              <input
                type="email"
                name="email"
                id="email"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={user.email!}
                disabled
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Display Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={user.name!}
                disabled
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Change Display Name</h2>
        <ChangeDisplayNameForm />
      </div>
    </div>
  );
}
