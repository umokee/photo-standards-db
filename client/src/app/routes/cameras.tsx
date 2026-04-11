import { Sidebar } from "@/components/layouts/sidebar/sidebar";
import { SplitLayout } from "@/components/layouts/split-layout/split-layout";
import Input from "@/components/ui/input/input";
import QueryState from "@/components/ui/query-state/query-state";
import useSidebar from "@/hooks/use-sidebar";
import { useGetCameras } from "@/page-components/cameras/api/get-cameras";
import { Wifi, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "../paths";

export function Component() {
  const { cameraId = null } = useParams();
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { close: closeSidebar } = useSidebar();
  const { data: cameras = [], isLoading: camerasLoading, isError: camerasError } = useGetCameras();

  const filtered = useMemo(
    () => cameras.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [cameras, search]
  );

  return (
    <SplitLayout>
      <SplitLayout.Sidebar>
        <Sidebar>
          <Sidebar.Header>
            <Sidebar.HeaderTop>
              <Sidebar.Title>Камеры</Sidebar.Title>
            </Sidebar.HeaderTop>
            <Input placeholder={"Поиск..."} noMargin value={search} onChange={setSearch} />
          </Sidebar.Header>
          <Sidebar.List>
            <QueryState
              isLoading={camerasLoading}
              isError={camerasError}
              isEmpty={!filtered.length}
              emptyTitle="Нет камер"
            >
              {filtered.map((camera) => (
                <Sidebar.Item
                  key={camera.id}
                  active={cameraId === camera.id}
                  onClick={() => {
                    navigate(paths.cameraDetail(camera.id));
                    closeSidebar();
                  }}
                >
                  <Sidebar.ItemDot />
                  <Sidebar.ItemBody>
                    <Sidebar.ItemName>{camera.name}</Sidebar.ItemName>
                  </Sidebar.ItemBody>
                  <Sidebar.ItemSide>
                    {camera.is_active ? (
                      <Wifi style={{ color: "green" }} />
                    ) : (
                      <WifiOff style={{ color: "red" }} />
                    )}
                  </Sidebar.ItemSide>
                </Sidebar.Item>
              ))}
            </QueryState>
          </Sidebar.List>
          <Sidebar.Footer>Создать камеру</Sidebar.Footer>
        </Sidebar>
      </SplitLayout.Sidebar>
      <SplitLayout.Content>
        <SplitLayout.Body>Тут ничего нет</SplitLayout.Body>
      </SplitLayout.Content>
    </SplitLayout>
  );
}
