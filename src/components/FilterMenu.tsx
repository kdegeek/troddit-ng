import React, { Fragment, useState, useEffect, useMemo } from "react";
import { FiFilter } from "react-icons/fi";
import { useMainContext } from "../MainContext";
import FilterModal from "./FilterModal";
import useLocation from "../hooks/useLocation";
import { useQueryClient } from "@tanstack/react-query";
import { numToString } from "../../lib/utils";

const FilterMenu = ({ hide = false }) => {
  const context: any = useMainContext();
  const { key } = useLocation();
  const queryClient = useQueryClient();
  const feedData = queryClient.getQueryData(key) as any;
  const [openFilter, setOpenFilter] = useState(0);
  const [filterCount, setFilterCount] = useState<number>(0);
  const active = context.filtersApplied > 0;

  useEffect(() => {
    let count = 0;
    feedData?.pages?.forEach((p) => (count += p?.filterCount ?? 0));
    setFilterCount(count);
  }, [feedData?.pages]);

  const filterCountDisplay = useMemo(
    () => numToString(filterCount, 999),
    [filterCount]
  );

  return (
    <>
      <FilterModal toOpen={openFilter} />
      <button
        aria-label="filters"
        aria-pressed={active}
        title={"filters"}
        className={
          "relative flex flex-col items-center flex-grow w-full h-full select-none"
        }
        onClick={(e) => {
          e.preventDefault();
          setOpenFilter((o) => o + 1);
        }}
      >
        {filterCount > 0 && (
          <span
            className="absolute text-white z-20 px-1 top-[-5px] right-[1.5px] translate-x-1/2 rounded-xl bg-th-accent "
            style={{ fontSize: "0.5rem", lineHeight: "1rem" }}
          >
            {filterCountDisplay}
          </span>
        )}

        <div
          className={
            "flex flex-row items-center justify-center w-full h-full  rounded-md  bg-th-background2 focus:outline-none" +
            (active
              ? " border border-th-borderHighlight text-th-textStrong"
              : " border border-transparent hover:border-th-border")
          }
        >
          <FiFilter
            className={"flex-none z-50 " + (active ? " w-6 h-6 " : " w-5 h-5 ")}
          />
        </div>
      </button>
    </>
  );
};

export default FilterMenu;
