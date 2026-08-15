import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Extract from "./pages/Extract";
import Superposition from "./pages/Superposition";
import Workspace from "./pages/Workspace";
import { AmbientSoundToggle, AnimatedGradient, ExpandMenu, PageUnlock } from "./components/Immersive";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/app"} component={Workspace} />
      <Route path={"/discover"} component={Discover} />
      <Route path={"/extract"} component={Extract} />
      <Route path={"/superposition"} component={Superposition} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <PageUnlock>
            <AnimatedGradient>
              <ExpandMenu />
              <AmbientSoundToggle />
              <Router />
            </AnimatedGradient>
          </PageUnlock>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
