// Cause List Types
export interface CauseListItem {
    sr_no: string | number;
    itemNo: string | number;
    cino: string;
    link_case_cino?: string;
    link_main_case_no_string?: string;
    link_main_sr_no?: number | string;
    case_no: string;
    main_case_no: string;
    if_listed_as_IA_string?: string;
    pet_name: string;
    pet_adv: string | null;
    pet_adv_cd: number;
    pet_adv_mobile: string;
    pet_adv_email: string;
    res_name: string;
    res_adv: string | null;
    res_adv_cd: number;
    res_adv_mobile: string;
    res_adv_email: string;
    ia_no: string | null;
    ia_flag: string | null;
    cause_case_type: number;
    cause_reg_no: number;
    cause_reg_year: number;
    ia_case_type: string | number | null;
    type_name: string | null;
    ia_type_name: string | null;
    ia_regno: string | boolean;
    ia_regyear: string;
    with_in: string;
    elimination?: string;
    cause_list_eliminate?: string;
    clink_code?: string;
    case_remark?: string;
    purpose_cd?: number;
    purpose_name?: string;
    purpose_header?: string;
    footer?: string | null;
    all_IA_string?: string | null;
}

export interface CauseListTitle {
    causelist_date: string;
    room_no: string;
    floor: string;
    building: string;
    bench_type_name: string;
    roaster_desc: string;
    causelist_time?: string;
    coram: string;
    cheader?: string;
    cfooter?: string;
    vc_link?: string;
    published?: string;
    filename?: string;
    for_bench_id?: number;
    cause_list_status?: string;
    no_of_judges?: number;
    bench_desc?: string;
    cause_list_type?: string;
}

// Inner data structure
export interface CauseListData {
    code: number;
    status: string;
    data: CauseListItem[];
    row_count?: number;
    causelist_title?: CauseListTitle;
}

// Outer API response wrapper
export interface CauseListResponse {
    status: string;
    folder: string;
    data: CauseListData;
}

// JOCD / TOC Types
export interface DocumentType {
    id: string | null;
    uuid: string | null;
    name: string | null;
    handle: string | null;
    metadata: Record<string, any>;
    documenttypename: string;
    entityType: string | null;
    type: string;
}

export interface Bitstream {
    id: string;
    uuid: string;
    name: string | null;
    handle: string | null;
    metadata: Record<string, any>;
    bundleName: string | null;
    documentTypeTreeRest: any | null;
    sizeBytes: number | null;
    pageCount: number | null;
    createDate: string | null;
    startPage: number;
    endPage: number;
    checkSum: string | null;
    sequenceId: number | null;
    type: string;
}

export interface DocumentTypeTree {
    id: string;
    uuid: string;
    name: string | null;
    handle: string | null;
    metadata: Record<string, any>;
    desc: string | null;
    templetName: string | null;
    isTemplet: boolean;
    isDate: boolean | null;
    isRemark: boolean | null;
    isDescription: boolean | null;
    isSubchild: boolean | null;
    hasSubChild: boolean | null;
    nonrepetitive: boolean;
    isforScanning: any | null;
    doc_date: string;
    indexUpdateAction: number;
    documentType: DocumentType;
    parent: any | null;
    parentuuid: string | null;
    hasChildren: boolean;
    children: DocumentTypeTree[];
    item: any | null;
    bitstream: Bitstream | null;
    templetTree: any | null;
    remarkdesc: string | null;
    index: number | null;
    entityType: string | null;
    rootOfmaster: boolean;
    display: boolean;
    type: string;
}

export interface JOCDResponse {
    status: string;
    jocd: string;
    file: string;
    data: DocumentTypeTree[];
}
