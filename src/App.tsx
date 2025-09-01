import { useState, useEffect } from "react";
import { ArrowSquareOutIcon, XIcon } from "@phosphor-icons/react";
import { perf } from "./main";
import { trace } from "firebase/performance";
import { analytics } from "./main";
import { logEvent } from "firebase/analytics";

const HOSTING_URL = window.location.href.split("?")[0];
interface ParsedURL {
  protocol: string;
  host: string;
  path: string;
  params: Record<string, string>;
}

function parseUrl(url: string): ParsedURL | null {
  try {
    if (analytics) {
      logEvent(analytics, "parse_url", {
        url: url,
      });
    }
    const u = new URL(url);
    const params: Record<string, string> = {};
    Array.from(u.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => (params[k] = v));
    return {
      protocol: u.protocol.replace(":", ""),
      host: u.host,
      path: u.pathname,
      params,
    };
  } catch {
    return null;
  }
}

function paramsEqual(a: Record<string, string>, b: Record<string, string>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) => b[k] === a[k]);
}

function getInitialUrls(): string[] {
  const params = new URLSearchParams(window.location.search);
  const urls = [
    params.get("url1"),
    params.get("url2"),
    params.get("url3"),
  ].filter(Boolean) as string[];
  return urls.length > 0 ? urls : [""];
}

function getInitialNotes(): string[] {
  const params = new URLSearchParams(window.location.search);
  const notes = [
    params.get("note1"),
    params.get("note2"),
    params.get("note3"),
  ].filter(Boolean) as string[];
  return notes;
}

function tryPrettifyJson(value: string): string | null {
  try {
    // Accepts both objects and arrays
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(parsed, null, 2);
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [urls, setUrls] = useState<string[]>(getInitialUrls());
  const [parsed, setParsed] = useState<(ParsedURL | null)[]>([]);
  // Track toggle state for each JSON param: { [urlIdx-paramKey]: boolean }
  const [jsonOpen, setJsonOpen] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<string[]>(getInitialNotes());

  useEffect(() => {
    if (perf) {
      const parsedTrace = trace(perf, "parsed_urls_change");
      parsedTrace.start();

      setParsed(urls.map(parseUrl));

      parsedTrace.stop();
    } else {
      setParsed(urls.map(parseUrl));
    }
  }, [urls]);

  // Ensure notes length stays in sync with urls length
  useEffect(() => {
    setNotes((prev) => {
      if (prev.length === urls.length) return prev;
      if (prev.length < urls.length) {
        return [...prev, ...Array(urls.length - prev.length).fill("")];
      }
      return prev.slice(0, urls.length);
    });
  }, [urls.length]);

  // Sync URLs and notes to query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    urls.forEach((url, i) => {
      if (url) params.set(`url${i + 1}`, url);
      const note = notes[i];
      if (note) params.set(`note${i + 1}`, note);
    });
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [urls, notes]);

  // Ensure jsonOpen state is initialized for new params (default open)
  useEffect(() => {
    const newJsonOpen: Record<string, boolean> = { ...jsonOpen };
    parsed.forEach((p, urlIdx) => {
      if (!p) return;
      Object.keys(p.params).forEach((paramKey) => {
        const key = `${urlIdx}-${paramKey}`;
        if (!(key in newJsonOpen)) {
          newJsonOpen[key] = true;
        }
      });
    });
    if (JSON.stringify(newJsonOpen) !== JSON.stringify(jsonOpen)) {
      setJsonOpen(newJsonOpen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const handleChange = (idx: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  };

  const handleNoteChange = (idx: number, value: string) => {
    setNotes((prev) => prev.map((n, i) => (i === idx ? value : n)));
  };

  const handleAdd = () => {
    if (urls.length < 3) {
      setUrls((prev) => [...prev, ""]);
      setNotes((prev) => [...prev, ""]);
    }
  };

  const handleRemove = (idx: number) => {
    if (urls.length > 1) {
      setUrls((prev) => prev.filter((_, i) => i !== idx));
      setNotes((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleToggleJson = (urlIdx: number, paramKey: string) => {
    setJsonOpen((prev) => {
      const key = `${urlIdx}-${paramKey}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleCheckIp = (ip: string) => {
    window.open(`https://whatismyipaddress.com/ip/${ip}`, "_blank");
  };

  const handleTimestamp = (ts: string) => {
    if (ts?.length == 10) {
      ts = ts.concat("000");
    }
    const date = new Date(Number(ts));
    window.alert(`${date.toString()}`);
  };

  const allParams = parsed.filter(Boolean).map((p) => p!.params);
  const canCompare = allParams.length > 1;
  //  && allParams.every((p) => Object.keys(p).length > 0);
  const allSame =
    canCompare && allParams.every((p) => paramsEqual(p, allParams[0]));

  // Find parameter keys that differ between URLs
  const getDifferentParamKeys = (): {
    missing: Set<string>;
    valueChanged: Set<string>;
  } => {
    if (!canCompare || allSame)
      return { missing: new Set(), valueChanged: new Set() };

    const allKeys = new Set<string>();
    allParams.forEach((params) => {
      Object.keys(params).forEach((key) => allKeys.add(key));
    });

    const missingKeys = new Set<string>();
    const valueChangedKeys = new Set<string>();

    allKeys.forEach((key) => {
      // Check if this key exists in all URLs
      const keyExistsInAll = allParams.every((params) =>
        Object.prototype.hasOwnProperty.call(params, key)
      );

      if (!keyExistsInAll) {
        // Key is missing from at least one URL - mark as missing
        missingKeys.add(key);
      } else {
        // Key exists in all URLs, check if values differ
        const values = allParams.map((params) => params[key]);
        const hasValueDiff =
          values.length > 1 && !values.every((v) => v === values[0]);

        if (hasValueDiff) {
          valueChangedKeys.add(key);
        }
      }
    });

    return { missing: missingKeys, valueChanged: valueChangedKeys };
  };

  const { missing: missingParamKeys, valueChanged: valueChangedParamKeys } =
    getDifferentParamKeys();

  const handleGoToUrl = (url: string) => {
    window.open(url, "_blank");
  };

  const handleParseUrl = (url: string) => {
    window.open(`${HOSTING_URL}?url1=${url}`, "_blank");
  };

  const isValidUrl = (string: string) => {
    let url;

    try {
      url = new URL(string);
    } catch {
      return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 font-inter">
      <h1 className="text-3xl font-bold mb-x6 text-center rounded p-2">
        TS URL Parser
      </h1>
      {urls.length < 3 && (
        <button
          className="mb-4 h-8 w-32 flex items-center justify-center border-2 border-dashed border-blue-400 rounded-lg text-blue-400 hover:bg-blue-50 transition max-w-xs cursor-pointer self-end"
          onClick={handleAdd}
          type="button"
          aria-label="Add URL"
        >
          <span className="text-sm">+ compare url</span>
        </button>
      )}
      {canCompare &&
        (missingParamKeys.size > 0 || valueChangedParamKeys.size > 0) && (
          <div className="mb-6 text-end self-end">
            <div className="text-xs mb-2">Parameter Key Legend</div>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              {missingParamKeys.size > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 rounded border border-gray-300"></div>
                  <span>Missing from some URLs</span>
                </div>
              )}
              {valueChangedParamKeys.size > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded border border-gray-300"></div>
                  <span>Different values across URLs</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></div>
                <span>Same value across all URLs</span>
              </div>
            </div>
          </div>
        )}
      <div
        className={`${
          urls.length == 1 && "max-w-4xl"
        } w-full flex flex-row flex-wrap gap-6 mb-8 justify-center`}
      >
        {urls.map((url, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 relative min-w-[260px] flex-1"
          >
            <div className="flex items-center gap-2">
              <label className="font-semibold">URL {i + 1}</label>
              <input
                className="mr-4 border-b border-gray-200 ml-2 w-3/4 px-2 pt-0.5 text-sm italic text-gray-600 focus:ring focus:border-blue-400"
                placeholder="Note"
                value={notes[i] || ""}
                onChange={(e) => handleNoteChange(i, e.target.value)}
              />
            </div>
            <textarea
              className="border rounded px-2 py-1 focus:outline-none focus:ring focus:border-blue-400 text-sm"
              placeholder={`Enter URL ${i + 1}`}
              value={url}
              onChange={(e) => handleChange(i, e.target.value)}
            />
            {urls.length > 1 && (
              <button
                className="absolute top-4 right-2 text-gray-400 hover:text-red-500 text-lg font-semibold cursor-pointer"
                onClick={() => handleRemove(i)}
                aria-label="Remove URL"
                type="button"
              >
                <XIcon />
              </button>
            )}
            {url && !parsed[i] && (
              <span className="text-red-500 text-sm">Invalid URL</span>
            )}
            {parsed[i] && (
              <div className="mt-2 text-sm flex flex-col gap-y-1">
                <div className="flex flex-row gap-2">
                  <div className="font-medium bg-gray-100 w-24 px-1 rounded-sm">
                    Protocol
                  </div>
                  <div>{parsed[i]!.protocol}</div>
                </div>
                <div className="flex flex-row gap-2">
                  <div className="font-medium bg-gray-100 w-24 px-1 rounded-sm shrink-0">
                    Host
                  </div>
                  <div>{parsed[i]!.host}</div>
                </div>
                <div className="flex flex-row gap-2">
                  <div className="font-medium bg-gray-100 w-24 px-1 rounded-sm shrink-0">
                    Path
                  </div>
                  <div className="wrap-anywhere">{parsed[i]!.path}</div>
                </div>
                <div className="flex flex-row gap-2">
                  <span className="font-medium bg-gray-100 w-24 px-1 rounded-sm shrink-0">
                    Parameters
                  </span>
                  <div>
                    {Object.keys(parsed[i]!.params).length === 0 ? (
                      <span className="ml-1x">None</span>
                    ) : (
                      <ul className="flex flex-col gap-y-1 list-none">
                        {Object.entries(parsed[i]!.params).map(([k, v]) => {
                          const isJson = tryPrettifyJson(v);
                          const key = `${i}-${k}`;
                          const isOpen = jsonOpen[key];
                          return (
                            <li className="flex" key={k}>
                              <span
                                className={`shrink-0 w-34 wrap-anywhere font-semibold rounded-sm pl-2 pr-1 py-px ${
                                  missingParamKeys.has(k)
                                    ? "bg-red-100"
                                    : valueChangedParamKeys.has(k)
                                    ? "bg-blue-100"
                                    : "bg-gray-100"
                                }`}
                              >
                                {k}
                              </span>
                              {isJson ? (
                                <div
                                  className={`ml-2 rounded-sm w-full ${
                                    valueChangedParamKeys.has(k)
                                      ? "bg-blue-100/50"
                                      : ""
                                  }`}
                                >
                                  {isJson?.length >= 3 && (
                                    <button
                                      className="ml-2 text-xs text-blue-500 underline hover:text-blue-700 cursor-pointer"
                                      onClick={() => handleToggleJson(i, k)}
                                      type="button"
                                    >
                                      {isOpen ? "Collapse" : "Expand"}
                                    </button>
                                  )}
                                  {isOpen ? (
                                    <pre className="ml-2 mt-1 overflow-x-auto text-xs whitespace-pre-wrap">
                                      {isJson}
                                    </pre>
                                  ) : (
                                    <div className="ml-2 mt-1 font-mono text-xs wrap-anywhere">
                                      {v.length > 80 ? v.slice(0, 80) + "…" : v}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={`ml-1 pl-1 wrap-anywhere w-full ${
                                    valueChangedParamKeys.has(k)
                                      ? "bg-blue-100/50 rounded-sm"
                                      : ""
                                  }`}
                                >
                                  {v}
                                  {k?.includes("ip") &&
                                    (v?.includes(".") || v?.includes(":")) && (
                                      <button
                                        className="ml-2 text-xs text-blue-500 underline hover:text-blue-700 cursor-pointer inline-flex"
                                        onClick={() => handleCheckIp(v)}
                                        type="button"
                                      >
                                        check ip info{" "}
                                        <ArrowSquareOutIcon size={16} />
                                      </button>
                                    )}
                                  {k.includes("ts") &&
                                    (v.length == 10 || v.length == 13) && (
                                      <button
                                        className="ml-2 text-xs text-blue-500 underline hover:text-blue-700 cursor-pointer inline-flex"
                                        onClick={() => handleTimestamp(v)}
                                        type="button"
                                      >
                                        {`convert to local time`}
                                      </button>
                                    )}
                                  {isValidUrl(v) && (
                                    <>
                                      <button
                                        className="ml-2 text-xs text-blue-500 underline hover:text-blue-700 cursor-pointer inline-flex"
                                        onClick={() => handleGoToUrl(v)}
                                        type="button"
                                      >
                                        {`Go to url`}
                                        <ArrowSquareOutIcon size={16} />
                                      </button>
                                      <button
                                        className="ml-2 text-xs text-blue-500 underline hover:text-blue-700 cursor-pointer inline-flex"
                                        onClick={() => handleParseUrl(v)}
                                        type="button"
                                      >
                                        {`Parse url`}
                                        <ArrowSquareOutIcon size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="w-full max-w-2xl text-center">
        {canCompare && (
          <div
            className={`rounded p-4 font-semibold ${
              allSame
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {allSame
              ? "All URLs have the same parameters key & value."
              : "URLs have different parameters."}
          </div>
        )}
      </div>
      <div className="mt-8 text-xs text-gray-400 text-center">
        You can prefill URLs using{" "}
        <span className="font-mono">
          ?url1=...&url2=...&url3=...&note1=...&note2=...&note3=...
        </span>{" "}
        in the address bar.
      </div>
    </div>
  );
}
