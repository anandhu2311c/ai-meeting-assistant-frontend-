"use client";

import { Card } from "@/components/ui/card";
import { ContentData } from "./ui/content";
import { HistoryData } from "@/lib/types";

interface HistoryProps {
  data: HistoryData[];
  deleteData: (createdAt: string) => void;
}

export default function History({ data: savedData, deleteData }: HistoryProps) {
  return (
    <div className="flex flex-col w-full">
      <main className="overflow-auto p-4 space-y-4">
        {savedData &&
          savedData?.map((data, index) => (
            <Card key={index} className="p-4 bg-gray-800 border-gray-600">
              <div className="flex mt-2 text-xs text-gray-300">
                {data.tag} • {data.createdAt} •{" "}
                <button
                  className="text-xs text-red-400 hover:text-red-300 underline ml-2"
                  onClick={() => {
                    deleteData(data.createdAt);
                  }}
                >
                  Delete
                </button>
              </div>
              <ContentData className="mt-2 text-sm text-gray-200" contentMaxLength={100}>
                {data.data}
              </ContentData>
            </Card>
          ))}
      </main>
    </div>
  );
}
