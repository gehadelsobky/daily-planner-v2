export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-border bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-[hsl(var(--foreground))] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} Daily Planner. All rights reserved | Powered by{" "}
          <a
            href="https://gehadelsobky.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Gehad El-Sobky
          </a>
        </p>
        <p>
          Inspired by{" "}
          <a
            href="https://www.marawannassar.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Marawan Nassar
          </a>
        </p>
      </div>
    </footer>
  );
}
