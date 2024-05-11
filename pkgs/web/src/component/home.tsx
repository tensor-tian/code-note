import { DatabaseOutlined, ProfileOutlined } from "@ant-design/icons";
import { Layout, Menu, message } from "antd";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import React, { useCallback, useEffect, useState } from "react";

// import Blocks from "./blocks";
import Graph from "./tree-graph";
import { MenuInfo } from "rc-menu/lib/interface";

// import Topics from "./topics";

const { Sider, Content } = Layout;

const menus = [
  {
    key: "repo",
    icon: <ProfileOutlined />,
    label: "Repo",
  },
  {
    key: "topic",
    icon: <DatabaseOutlined />,
    label: "Topic",
    children: [
      // {
      //   key: "topic/list",
      //   label: "List",
      // },
      // {
      //   key: "topic/tree",
      //   label: "File Tree",
      // },
      {
        key: "topic/graph",
        label: "Flow Graph",
      },
    ],
  },
];
const parsePath = (pathname: string) => {
  const parts = pathname
    .substring(1)
    .split("/")
    .filter((part) => part.length > 0);
  const selected = parts.length === 0 ? ["topic"] : [parts.join("/")];
  const open = parts.reduce((prev, cur, i) => {
    if (i === parts.length - 1) {
      return prev;
    }
    if (i === 0) {
      prev.push(cur);
    } else {
      prev.push(prev[prev.length - 1] + "/" + cur);
    }
    return prev;
  }, [] as string[]);
  // console.log(pathname, parts, open);
  return { selected, open };
};

const Home: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const location = useLocation();
  useEffect(() => {
    const { selected, open } = parsePath(location.pathname);
    setSelectedKeys(selected);
    setOpenKeys(open);
  }, [location.pathname]);

  const navigate = useNavigate();
  const onClick = useCallback(
    (info: MenuInfo) => {
      setSelectedKeys([info.key]);
      navigate(`/${info.key}`, {
        replace: true,
      });
    },
    [navigate]
  );

  return (
    <Layout className="h-full">
      <Sider width={180}>
        <Menu
          mode="inline"
          onClick={onClick}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menus}
        ></Menu>
      </Sider>
      <Content>
        <Routes>
          {/* <Route path="topic/list" element={<Topics />} />
            <Route path="topic/tree/:topicId/:blockId" element={<Blocks />} /> */}
          <Route path="topic/graph" element={<Graph />} />
          <Route path="*" element={<Navigate to="topic/graph" />} />
        </Routes>
      </Content>
    </Layout>
  );
};

export default Home;
