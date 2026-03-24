import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, File as FileIcon, UploadCloud, Github, ArrowRight, LayoutTree, GitBranch, TerminalSquare, Box, FolderOpen, FileCode, FileJson, Image as ImageIcon, ChevronRight, ChevronDown, AlertCircle, Search, List, GitMerge } from "lucide-react";
import clsx from "clsx";
import { twMerge } from 'tailwind-merge';
import Tree from "react-d3-tree";
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';

// Helper to pick an icon based on file extension
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
      return <FileCode size={16} className="text-blue-400" />;
    case 'json':
      return <FileJson size={16} className="text-green-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'gif':
      return <ImageIcon size={16} className="text-purple-400" />;
    case 'zip':
    case 'tar':
    case 'gz':
      return <Box size={16} className="text-orange-400" />;
    default:
      return <FileIcon size={16} className="text-gray-400" />;
  }
};

const cn = (...inputs) => twMerge(clsx(inputs));

// === Architect View Data (Blue Theme) ===
const architectNodes = [
  { id: '1', position: { x: 300, y: 50 }, data: { label: 'CDN' }, className: 'architect-node' },
  { id: '2', position: { x: 300, y: 150 }, data: { label: 'API Gateway' }, className: 'architect-node' },
  { id: '3', position: { x: 450, y: 250 }, data: { label: 'Frontend' }, className: 'architect-node' },
  { id: '4', position: { x: 300, y: 350 }, data: { label: 'Backend' }, className: 'architect-node' },
  { id: '5', position: { x: 150, y: 450 }, data: { label: 'Cache' }, className: 'architect-node' },
  { id: '6', position: { x: 450, y: 450 }, data: { label: 'Auth Service' }, className: 'architect-node' },
  { id: '7', position: { x: 300, y: 550 }, data: { label: 'Database' }, className: 'architect-node' },
];

const createEdge = (id, source, target, type = 'bezier') => ({
  id, source, target, type,
  className: 'architect-link',
  markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(96, 165, 250, 0.8)' }
});

const architectEdges = [
  createEdge('e1-2', '1', '2', 'default'),
  createEdge('e2-3', '2', '3'),
  createEdge('e2-4', '2', '4'),
  createEdge('e3-4', '3', '4'),
  createEdge('e4-5', '4', '5'),
  createEdge('e5-4', '5', '4'),
  createEdge('e4-6', '4', '6'),
  createEdge('e6-4', '6', '4'),
  createEdge('e4-7', '4', '7')
];

const FileTreeNode = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isFolder = node.type === "folder";

  return (
    <div className="select-none font-mono text-sm">
      <div
        className={clsx(
          "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[rgba(255,255,255,0.05)] cursor-pointer transition-colors duration-200",
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => isFolder && setIsOpen(!isOpen)}
      >
        {isFolder ? (
          <div className="flex items-center gap-1.5 text-[var(--folder-color)]">
            {isOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            {isOpen ? <FolderOpen size={16} /> : <Folder size={16} />}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-5">
            {getFileIcon(node.name)}
          </div>
        )}
        <span className={clsx("truncate", { "text-[var(--text-primary)]": isFolder, "text-[var(--text-secondary)]": !isFolder })}>
          {node.name}
        </span>
      </div>

      <AnimatePresence>
        {isFolder && isOpen && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {node.children
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "folder" ? -1 : 1;
              })
              .map((child, idx) => (
                <FileTreeNode key={`${child.name}-${idx}`} node={child} level={level + 1} />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const buildStructureFromFiles = (files) => {
  const root = [];
  files.forEach((file) => {
    // files from dropzone have a path property representing the relative file path
    const parts = (file.path || file.name).split('/').filter(Boolean);
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      let existingPath = currentLevel.find((item) => item.name === part);

      if (!existingPath) {
        existingPath = {
          name: part,
          type: isFile ? 'file' : 'folder',
          ...(!isFile && { children: [] })
        };
        currentLevel.push(existingPath);
      }
      if (!isFile) {
        currentLevel = existingPath.children;
      }
    });
  });
  return root;
};

const mapForD3 = (nodes) => {
  if (!nodes) return [];
  return nodes.map(node => ({
    name: node.name,
    attributes: { type: node.type },
    children: mapForD3(node.children)
  }));
};

function App() {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'diagram'

  const handleGithubSubmit = async (e) => {
    e.preventDefault();
    if (!githubUrl) return;

    setError(null);
    setStructure(null);
    setLoading(true);

    try {
      // Parse owner, repo, and optional branch + path from URL
      const urlMatches = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)\/(.+))?/);

      if (!urlMatches) throw new Error("Invalid GitHub URL. Must be like https://github.com/owner/repo");

      const owner = urlMatches[1];
      const repo = urlMatches[2].replace(/\.git$/, "");
      const branchFromUrl = urlMatches[3];
      const subpath = urlMatches[4] ? decodeURIComponent(urlMatches[4]) : null;

      // Get default branch if not provided in URL
      let branch = branchFromUrl;
      const headers = githubToken ? { Authorization: `token ${githubToken}` } : {};
      
      if (!branch) {
        const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        branch = repoInfo.data.default_branch;
      }

      // Fetch the recursive tree
      const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });

      let filesOnly = treeRes.data.tree.filter(item => item.type === "blob");

      // If the user pasted a link to a specific subdirectory, filter and trim the paths
      if (subpath) {
        const prefix = `${subpath}/`;
        filesOnly = filesOnly
          .filter(item => item.path.startsWith(prefix) || item.path === subpath)
          .map(item => ({
            path: item.path.startsWith(prefix) ? item.path.substring(prefix.length) : item.path
          }));
      } else {
        filesOnly = filesOnly.map(item => ({ path: item.path }));
      }

      if (filesOnly.length === 0) {
        throw new Error(subpath ? `No files found in folder '${subpath}'.` : "Repository is empty.");
      }

      const generatedStructure = buildStructureFromFiles(filesOnly);
      setStructure(generatedStructure);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to parse GitHub repository.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setError(null);
    setStructure(null);

    if (acceptedFiles.length === 0) return;

    if (acceptedFiles.length === 1 && acceptedFiles[0].name.toLowerCase().endsWith('.zip')) {
      // Handle Single ZIP Drop - send to backend
      setLoading(true);
      const formData = new FormData();
      formData.append("file", acceptedFiles[0]);

      try {
        const res = await axios.post("http://localhost:5000/upload", formData);
        setStructure(res.data);
      } catch (err) {
        console.error("Upload error:", err);
        setError(err.response?.data?.error || "Failed to process ZIP file. Ensure the backend server is running.");
      } finally {
        setLoading(false);
      }
    } else {
      // Handle Folder Drop (or multiple files) - parse directly on frontend!
      setLoading(true);
      // Simulate slight delay for heavy parsing to allow UI update
      setTimeout(() => {
        try {
          const tree = buildStructureFromFiles(acceptedFiles);
          setStructure(tree);
        } catch (err) {
          setError("Failed to parse folder structure.");
        } finally {
          setLoading(false);
        }
      }, 100);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop
  });

  return (
    <div className="min-h-screen p-8 flex flex-col items-center bg-[var(--bg-color)] text-[var(--text-primary)] relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[1200px] relative z-10 flex flex-col flex-1">
        <header className="mb-14 mt-6 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 blur-xl opacity-50 rounded-full animate-pulse" />
              <div className="relative bg-[#0d1117] border border-[var(--border-color)] p-3 rounded-2xl shadow-2xl">
                <Box size={40} className="text-[var(--accent)]" />
              </div>
            </div>
            <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 drop-shadow-sm pr-2 pb-2">
              ArchScope
            </h1>
          </motion.div>
          <p className="text-[var(--text-secondary)] text-xl font-medium tracking-wide">
            Instantly visualize the internal structure of any repository.
          </p>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col">
          {!structure && !loading && (
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleGithubSubmit} className="mb-6 w-full">
                <div className="mb-3 flex items-center gap-3">
                  <input
                    type="password"
                    placeholder="GitHub Personal Access Token (optional - for higher rate limits)"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--panel-bg)] hover:bg-[rgba(48,54,61,0.6)] focus:outline-none focus:border-[var(--accent)] transition-colors text-sm"
                  />
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-[rgba(88,166,255,0.1)] text-blue-400 hover:bg-[rgba(88,166,255,0.2)] text-sm font-medium transition-colors"
                  >
                    Create Token
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Github size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter a GitHub Repository URL..."
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full pl-12 pr-24 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--panel-bg)] hover:bg-[rgba(48,54,61,0.6)] focus:outline-none focus:border-[var(--accent)] transition-colors shadow-lg"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-2 right-2 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all shadow-md flex items-center gap-2"
                  >
                    Scan <Search size={16} />
                  </button>
                </div>
              </form>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-[var(--border-color)] flex-1"></div>
                <span className="text-[var(--text-secondary)] font-medium">OR</span>
                <div className="h-px bg-[var(--border-color)] flex-1"></div>
              </div>

              <div
                {...getRootProps()}
                className={clsx(
                  "w-full h-80 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                  isDragActive
                    ? "border-[var(--accent)] bg-[rgba(88,166,255,0.1)] shadow-[0_0_30px_rgba(88,166,255,0.2)]"
                    : "border-[var(--border-color)] bg-[var(--panel-bg)] hover:border-gray-500 hover:bg-[rgba(48,54,61,0.6)]"
                )}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={{ y: isDragActive ? -10 : 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="p-4 bg-[rgba(255,255,255,0.05)] rounded-full mb-4">
                    <UploadCloud size={48} className={isDragActive ? "text-[var(--accent)]" : "text-gray-400"} />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">
                    {isDragActive ? "Drop to analyze..." : "Drag & Drop your Project here"}
                  </h2>
                  <p className="text-gray-500 max-w-md text-center">
                    Supports dropping a compiled <strong>.ZIP</strong> file or dragging an entire <strong>Folder</strong> directly right here.
                  </p>
                </motion.div>
              </div>
            </div>
          )}

          {loading && (
            <div className="w-full h-64 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="mb-4"
              >
                <Box size={32} className="text-[var(--accent)]" />
              </motion.div>
              <p className="text-lg">Analyzing structure...</p>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 max-w-4xl mx-auto"
            >
              <AlertCircle size={20} />
              <p>{error}</p>
            </motion.div>
          )}

          {structure && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--panel-bg)] shadow-2xl overflow-hidden backdrop-blur-md flex flex-col"
            >
              <div className="flex flex-wrap items-center justify-between p-4 border-b border-[var(--border-color)] bg-[rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3">
                  <Box size={20} className="text-[var(--accent)]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Project Structure</h3>

                  <div className="ml-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('tree')}
                        className={clsx("px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2", viewMode === 'tree' ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/20" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                      >
                        <List size={16} /> Tree
                      </button>
                      <button
                        onClick={() => setViewMode('diagram')}
                        className={clsx("px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2", viewMode === 'diagram' ? "bg-purple-600 text-white shadow-md shadow-purple-600/20" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                      >
                        <GitBranch size={16} /> Diagram
                      </button>
                      <button
                        onClick={() => setViewMode('architect')}
                        className={clsx("px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2", viewMode === 'architect' ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10")}
                      >
                        <Box size={16} /> Architect
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStructure(null)}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors mt-2 sm:mt-0 shadow-sm"
                >
                  Upload Another
                </button>
              </div>

              {viewMode === 'tree' && (
                <div className="p-4 max-h-[700px] overflow-y-auto w-full">
                  {(structure.children || structure).sort((a, b) => (a.type === 'folder' ? -1 : 1)).map((node, i) => (
                    <FileTreeNode key={i} node={node} level={0} />
                  ))}
                </div>
              )}

              {viewMode === 'diagram' && (
                <div className="w-full h-[700px] bg-[rgba(0,0,0,0.2)] rounded-b-2xl overflow-hidden relative border-t border-[var(--border-color)]">
                  <Tree
                    data={{ name: githubUrl.split('/').pop() || 'Project Root', attributes: { type: 'folder' }, children: mapForD3(structure) }}
                    orientation="horizontal"
                    pathFunc="step"
                    zoomable={true}
                    nodeSize={{ x: 300, y: 60 }}
                    separation={{ siblings: 1.2, nonSiblings: 1.5 }}
                    translate={{ x: 50, y: 350 }}
                    pathClassFunc={() => 'custom-link'}
                    renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
                      const isFolder = nodeDatum.attributes?.type === 'folder';
                      const textLen = nodeDatum.name.length;
                      const rectWidth = Math.max(160, textLen * 9 + 60);

                      return (
                        <g onClick={toggleNode} style={{ cursor: 'pointer' }}>
                          <foreignObject
                            width={rectWidth}
                            height={44}
                            x={0}
                            y={-22}
                            className="overflow-visible"
                          >
                            <div
                              className={clsx(
                                "flex items-center gap-2 w-full h-full px-3 transition-colors duration-200 shadow-md",
                                isFolder
                                  ? "bg-[#142646] border border-[#2563eb] text-[#eff6ff] rounded-[10px] hover:bg-[#1a325b]"
                                  : "bg-[#1f2937] border border-[#4b5563] text-[#d1d5db] rounded-[10px] hover:bg-[#374151]"
                              )}
                              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                            >
                              <div className="shrink-0 flex items-center">
                                {isFolder ? <Folder size={16} className="text-[#60a5fa]" /> : getFileIcon(nodeDatum.name)}
                              </div>

                              <span
                                className="truncate font-medium text-[14px] leading-none flex-1"
                              >
                                {nodeDatum.name}
                              </span>

                              {isFolder && nodeDatum.children && (
                                <div className="shrink-0 w-[20px] h-[20px] flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] text-[12px] font-bold text-white shadow-sm leading-none">
                                  {nodeDatum.__rd3t.collapsed ? '+' : '-'}
                                </div>
                              )}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    }}
                  />
                </div>
              )}

              {viewMode === 'architect' && (
                <div className="w-full h-[750px] bg-[rgba(0,0,0,0.2)] rounded-b-2xl pt-8 pb-4 flex flex-col items-center relative border-t border-[var(--border-color)]">
                  <h2 className="z-10 mb-6 text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    The Architect (High-Level Mapping)
                  </h2>
                  <div className="flex-1 w-full relative max-h-full">
                    <ReactFlow
                      nodes={architectNodes}
                      edges={architectEdges}
                      fitView
                      fitViewOptions={{ padding: 0.5 }}
                      proOptions={{ hideAttribution: true }}
                    >
                      <Background color="#60a5fa" variant="dots" gap={24} size={1} style={{ opacity: 0.1 }} />
                      <Controls className="!bg-[#0d1117] !border-[#3b82f6]/40 !fill-[#60a5fa]" />
                    </ReactFlow>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </main>

        <footer className="mt-12 mb-6 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
          <p>
            Built for seamless architectural visualization.
            Drop a folder, paste a GitHub URL, or upload a ZIP file.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>All systems operational</span>
          </div>
          <p className="mt-6 text-[13px] font-medium tracking-wide">
            Designed & Developed by <a href="https://github.com/AryanYadav57" target="_blank" rel="noopener noreferrer" className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-bold hover:opacity-80 transition-opacity">Aryan Yadav</a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;