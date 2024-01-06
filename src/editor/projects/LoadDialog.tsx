import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import ListGroup from "react-bootstrap/ListGroup";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import {
  ClipboardFill,
  ClipboardCheckFill,
  FileEarmarkFill,
  PencilFill,
  SaveFill,
  TrashFill,
} from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import { Project, projectsDB } from "./project";

export type Props = {
  show: boolean;
  onHide: (source?: string) => void;
};

export default function LoadDialog({ show, onHide }: Props) {
  const [projects, setProjects] = useState<Project[]>();

  async function fetchProjects() {
    const db = await projectsDB();
    const projects = await db.getAll("projects");
    setProjects(projects.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0)));
  }

  useEffect(() => {
    if (show) fetchProjects();
  }, [show]);

  return (
    <Modal
      size="lg"
      show={show}
      onHide={() => onHide()}
      centered
      backdropClassName="modal-backdrop"
    >
      <Modal.Header closeButton>
        <Modal.Title>Projects Saved Locally</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          height: "50vh",
          overflow: "auto",
        }}
      >
        <ListGroup className="mb-2">
          {projects?.map((project) => (
            <ListGroupItem
              key={project.id}
              className="d-flex align-items-center"
              action
              onClick={() => onHide(project.source)}
            >
              <div className="me-auto">{project.name}</div>

              <Button
                size="sm"
                variant="outline-success"
                className="d-flex align-items-center me-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onHide(project.source);
                }}
              >
                <FileEarmarkFill className="me-2" />
                Load
              </Button>

              <Button
                size="sm"
                variant="outline-secondary"
                className="d-flex align-items-center me-2"
                onClick={async (event) => {
                  event.stopPropagation();
                  await navigator.clipboard.writeText(project.source);
                  alert("Copied to clipboard.");
                }}
              >
                <ClipboardFill className="me-2" title="Copy to Clipboard" />
                Copy
              </Button>

              <Button
                size="sm"
                variant="outline-secondary"
                className="d-flex align-items-center me-4"
                onClick={(event) => {
                  event.stopPropagation();
                  const a = document.createElement("a");
                  a.href = `data:text/plain,${project.source}`;
                  a.download = `${project.name}.sparkground`;
                  a.click();
                }}
              >
                <SaveFill className="me-2" />
                Save as File
              </Button>

              <Button
                size="sm"
                variant="outline-primary"
                className="d-flex align-items-center me-2"
                onClick={async (event) => {
                  event.stopPropagation();

                  const name = prompt("Name your project:");
                  if (name === null) return;

                  const db = await projectsDB();
                  db.put("projects", {
                    ...project,
                    name,
                  });
                  fetchProjects();
                }}
              >
                <PencilFill className="me-2" />
                Rename
              </Button>

              <Button
                size="sm"
                variant="outline-danger"
                className="d-flex align-items-center"
                onClick={async (event) => {
                  event.stopPropagation();

                  const confirmation = confirm("Are you sure?");
                  if (!confirmation) return;

                  const db = await projectsDB();
                  db.delete("projects", IDBKeyRange.only(project.id));
                  fetchProjects();
                }}
              >
                <TrashFill className="me-2" />
                Delete
              </Button>
            </ListGroupItem>
          ))}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          className="d-flex align-items-center"
          onClick={async (event) => {
            event.stopPropagation();

            const source = await navigator.clipboard.readText();

            const name = prompt("Name your project:");
            if (name === null) return;

            const db = await projectsDB();
            await db.add("projects", {
              modified: new Date().getTime(),
              name,
              source,
            });
            fetchProjects();
          }}
        >
          <ClipboardCheckFill className="me-2" />
          Paste
        </Button>

        <Button
          variant="outline-secondary"
          className="d-flex align-items-center"
          onClick={async (event) => {
            event.stopPropagation();

            const input = document.createElement("input");
            input.type = "file";
            input.addEventListener("change", async () => {
              const source = await input.files?.[0].text();
              if (source === undefined) return;

              const name = prompt("Name your project:");
              if (name === null) return;

              const db = await projectsDB();
              await db.add("projects", {
                modified: new Date().getTime(),
                name,
                source,
              });
              fetchProjects();
            });
            input.click();
          }}
        >
          <SaveFill className="me-2" style={{ transform: "rotate(180deg)" }} />
          Load File
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
