import useAuth from "../hooks/useAuth";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

/**
 * Example component demonstrating the useAuth hook usage
 */
const AuthExample = () => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Please Login</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You need to be logged in to view this content.
          </p>
          <Button onClick={() => auth.requireAuth()} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p>
            <strong>Name:</strong> {auth.user?.name}
          </p>
          <p>
            <strong>Email:</strong> {auth.user?.email}
          </p>
          <p>
            <strong>Role:</strong> {auth.user?.role}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Role Checks:</h4>
          <ul className="text-sm space-y-1">
            <li>Is Admin: {auth.isAdmin ? "Yes" : "No"}</li>
            <li>Is Consumer: {auth.isConsumer ? "Yes" : "No"}</li>
            <li>Is Provider: {auth.isProvider ? "Yes" : "No"}</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Route Access:</h4>
          <ul className="text-sm space-y-1">
            <li>
              Can access admin routes:{" "}
              {auth.canAccessRoute("admin") ? "Yes" : "No"}
            </li>
            <li>
              Can access provider routes:{" "}
              {auth.canAccessRoute("provider") ? "Yes" : "No"}
            </li>
            <li>
              Can access any protected route:{" "}
              {auth.canAccessRoute("any") ? "Yes" : "No"}
            </li>
          </ul>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={auth.goToDashboard}
            variant="outline"
            className="flex-1"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={auth.logout}
            variant="destructive"
            className="flex-1"
          >
            Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthExample;
