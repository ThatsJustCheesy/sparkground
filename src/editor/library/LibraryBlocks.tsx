import "./library.css";
import { Renderer } from "../trees/render";
import { LibraryCategories, LibraryCategory } from "./library-defs";
import { TypeInferrer } from "../../typechecker/infer";
import { Tree } from "../trees/trees";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import { InitialEnvironment } from "./environments";

export default function LibraryBlocks() {
  return <LibraryCategoryTabs categories={LibraryCategories} />;
}

function LibraryCategoryTabs({ categories }: { categories?: LibraryCategory[] }) {
  if (!categories?.length) return <></>;
  return (
    <Tab.Container defaultActiveKey={0}>
      <Nav variant="pills" className="library-category-tabs">
        {categories.map((category, categoryIndex) => (
          <Nav.Item key={categoryIndex}>
            <Nav.Link eventKey={categoryIndex}>
              <div className="library-nav-link-text">{category.name}</div>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
      <Tab.Content>
        {categories.map((category, categoryIndex) => (
          <Tab.Pane key={categoryIndex} eventKey={categoryIndex} transition={false} unmountOnExit>
            {category.entries?.map((expr, index) => {
              const tree: Tree = {
                id: `library-${categoryIndex}-${index}`,
                root: expr,
                location: { x: 0, y: 0 },
                zIndex: 1,
                inferrer: new TypeInferrer(),
              };

              return new Renderer(tree, InitialEnvironment, tree.inferrer, {}).render(expr, {
                isCopySource: true,
              });
            })}

            {<LibraryCategoryTabs categories={category.subcategories} />}
          </Tab.Pane>
        ))}
      </Tab.Content>
    </Tab.Container>
  );
}
